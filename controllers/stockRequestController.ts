import { Request, Response } from 'express';
import {
  StockRequest,
  StockRequestItem,
  Product,
  User,
  AdminInventory,
  InventoryTransaction
} from '../models';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database';
import { logError, logInfo } from '../utils/loggerHelper';
import { Op, Transaction } from 'sequelize';

// Helper function to generate next integer ID for stock requests
const getNextStockRequestId = async (transaction: Transaction): Promise<string> => {
  const [results] = await sequelize.query(
    `SELECT id FROM stock_requests 
     WHERE id ~ '^[0-9]+$' 
     ORDER BY CAST(id AS INTEGER) DESC 
     LIMIT 1`,
    { transaction }
  ) as [any[], unknown];

  if (results && results.length > 0) {
    const lastId = parseInt(results[0].id, 10);
    if (!isNaN(lastId)) {
      return (lastId + 1).toString();
    }
  }

  return '1'; // Start from 1 if no numeric ID exists
};

const buildRequestIncludes = () => ([
  {
    model: StockRequestItem,
    as: 'items'
  },
  {
    model: User,
    as: 'requester',
    attributes: ['id', 'name', 'role']
  },
  {
    model: User,
    as: 'dispatcher',
    attributes: ['id', 'name']
  },
  {
    model: User,
    as: 'confirmer',
    attributes: ['id', 'name']
  }
]);

interface NormalizedItem {
  product_id: string | null;
  product_name: string;
  model: string;
  quantity: number;
}

const normalizeItemsPayload = async (rawItems: any, transaction: Transaction): Promise<NormalizedItem[]> => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('At least one line item is required');
  }

  const normalizedItems: NormalizedItem[] = [];

  for (const item of rawItems) {
    const quantity = Number(item.quantity);

    if (!quantity || quantity <= 0) {
      throw new Error('Each item must have a quantity greater than 0');
    }

    let productRecord: Product | null = null;
    let productName = item.product_name;
    let model = item.model;
    let productId: string | null = item.product_id || null;

    if (productId) {
      productRecord = await Product.findByPk(productId, { transaction });
      if (!productRecord) {
        throw new Error(`Product not found for id ${productId}`);
      }
      // Automatically fetch product details from the database
      productName = productName || productRecord.name;
      model = model || productRecord.model;
    }

    // If product_id is not provided, product_name and model are required
    if (!productId && (!productName || !model)) {
      throw new Error('product_id is required, or product_name and model must be provided');
    }

    normalizedItems.push({
      product_id: productId,
      product_name: productName,
      model,
      quantity
    });
  }

  return normalizedItems;
};

const attachStockRequestItems = async (stockRequestId: string, items: NormalizedItem[], transaction: Transaction): Promise<void> => {
  for (const item of items) {
    await StockRequestItem.create({
      id: uuidv4(),
      stock_request_id: stockRequestId,
      product_id: item.product_id,
      product_name: item.product_name,
      model: item.model,
      quantity: item.quantity
    }, { transaction });
  }
};

// Get all stock requests (with role-based filtering)
export const getAllStockRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { status, requested_by_id, requested_by, requested_from } = req.query;
    const andConditions: any[] = [];

    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === 'agent') {
      // Agents only see their own requests
      andConditions.push({ requested_by_id: userId });
    } else if (userRole === 'admin') {
      // Admins see:
      // 1. Requests from their agents
      // 2. Their own requests (to super-admin or other admins)
      // 3. Incoming admin-to-admin transfers (requested_from = admin's ID)
      const agents = await User.findAll({
        where: {
          role: 'agent',
          created_by_id: userId
        },
        attributes: ['id']
      });
      const agentIds = agents.map((agent) => agent.id);

      const roleCondition: any = {
        [Op.or]: [
          { requested_by_id: { [Op.in]: agentIds } },
          { requested_by_id: userId },
          { requested_from: userId }
        ]
      };

      andConditions.push(roleCondition);
    } else if (userRole === 'super-admin') {
      // Super-admin sees requests from admins (requested_from = 'super-admin')
      andConditions.push({ requested_from: 'super-admin' });
    } else if (userRole === 'account') {
      // Account role sees all requests (no base filter)
    }

    if (status) {
      andConditions.push({ status });
    }

    if (requested_by_id || requested_by) {
      andConditions.push({ requested_by_id: requested_by_id || requested_by });
    }

    if (requested_from) {
      andConditions.push({ requested_from });
    }

    const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

    const requests = await StockRequest.findAll({
      where,
      include: buildRequestIncludes(),
      order: [['requested_date', 'DESC']]
    });

    logInfo('Get all stock requests', { count: requests.length, status: status as string || 'all' });
    res.json(requests);
  } catch (error) {
    logError('Get all stock requests error', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get stock request by ID
export const getStockRequestById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const request = await StockRequest.findByPk(id, {
      include: buildRequestIncludes()
    });

    if (!request) {
      res.status(404).json({ error: 'Stock request not found' });
      return;
    }

    logInfo('Get stock request by ID', { requestId: id });
    res.json(request);
  } catch (error) {
    logError('Get stock request by ID error', error, { requestId: req.params.id });
    res.status(500).json({ error: 'Server error' });
  }
};

// Create stock request
export const createStockRequest = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    if (!req.user) {
      await transaction.rollback();
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { items: rawItems, requested_from, notes } = req.body;
    let itemsPayload: any = rawItems;

    if (typeof itemsPayload === 'string') {
      try {
        itemsPayload = JSON.parse(itemsPayload);
      } catch (parseError) {
        await transaction.rollback();
        res.status(400).json({ error: 'items must be a JSON array' });
        return;
      }
    }

    // Backward compatibility with legacy single-item payload
    if ((!itemsPayload || !itemsPayload.length) && req.body.product_id) {
      itemsPayload = [{
        product_id: req.body.product_id,
        product_name: req.body.product_name,
        model: req.body.model,
        quantity: req.body.quantity
      }];
    }

    if (!requested_from) {
      await transaction.rollback();
      res.status(400).json({ error: 'requested_from is required' });
      return;
    }

    const normalizedItems = await normalizeItemsPayload(itemsPayload, transaction);
    const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);

    const requestedByRole = req.user.role === 'admin' ? 'admin' : 'agent';
    const requestedFromRole = requested_from === 'super-admin' ? 'super-admin' : 'admin';

    // Validate requested_from based on requester role
    if (requestedFromRole === 'admin') {
      // If requester is an agent and requested_from is "admin" (placeholder), allow it
      // This is a special case where agents don't specify which admin yet
      if (requestedByRole === 'agent' && requested_from === 'admin') {
        // Allow "admin" as a placeholder for agent requests
        // The actual admin will be determined during dispatch
      } else {
        // For admin-to-admin transfers, requested_from must be a valid admin ID
        const fromUser = await User.findOne({
          where: { id: requested_from, role: 'admin' },
          transaction
        });

        if (!fromUser) {
          await transaction.rollback();
          res.status(400).json({ error: 'Requested from user not found or not an admin' });
          return;
        }
      }
    }
    const primaryItem = normalizedItems[0];

    const nextId = await getNextStockRequestId(transaction);

    const newRequest = await StockRequest.create({
      id: nextId,
      primary_product_id: primaryItem.product_id,
      primary_product_name: primaryItem.product_name,
      primary_model: primaryItem.model,
      total_quantity: totalQuantity,
      requested_by_id: req.user.id,
      requested_by_name: req.user.name,
      requested_by_role: requestedByRole,
      requested_from,
      requested_from_role: requestedFromRole,
      notes: notes || null
    }, { transaction });

    await attachStockRequestItems(newRequest.id, normalizedItems, transaction);

    await transaction.commit();

    const created = await StockRequest.findByPk(newRequest.id, {
      include: buildRequestIncludes()
    });

    if (!created) {
      res.status(500).json({ error: 'Failed to retrieve created request' });
      return;
    }

    logInfo('Stock request created', { requestId: created.id, requestedBy: req.user.id, requestedFrom: requested_from, totalQuantity, createdBy: req.user.id });
    res.status(201).json(created);
  } catch (error: any) {
    await transaction.rollback();
    logError('Create stock request error', error, { requestedBy: req.user?.id, requestedFrom: req.body.requested_from });
    res.status(400).json({ error: error.message || 'Unable to create stock request' });
  }
};

const adjustAdminInventory = async (adminId: string, productId: string, quantity: number, transaction: Transaction): Promise<AdminInventory> => {
  let record = await AdminInventory.findOne({
    where: { admin_id: adminId, product_id: productId },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (record) {
    await record.increment('quantity', { by: quantity, transaction });
    await record.reload({ transaction });
  } else {
    record = await AdminInventory.create({
      id: uuidv4(),
      admin_id: adminId,
      product_id: productId,
      quantity
    }, { transaction });
  }

  return record;
};

const ensureSourceAdminInventory = async (adminId: string, items: NormalizedItem[], transaction: Transaction): Promise<void> => {
  for (const item of items) {
    if (!item.product_id) {
      throw new Error(`Product ID is required for item ${item.product_name}`);
    }
    const inventory = await AdminInventory.findOne({
      where: { admin_id: adminId, product_id: item.product_id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!inventory || inventory.quantity < item.quantity) {
      throw new Error(`Insufficient stock for product ${item.product_name} in source admin inventory`);
    }
  }
};

const decrementAdminInventory = async (adminId: string, item: NormalizedItem, transaction: Transaction): Promise<void> => {
  if (!item.product_id) {
    throw new Error(`Product ID is required for item ${item.product_name}`);
  }
  const inventory = await AdminInventory.findOne({
    where: { admin_id: adminId, product_id: item.product_id },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (!inventory) {
    throw new Error(`Inventory record not found for product ${item.product_name}`);
  }

  await inventory.decrement('quantity', { by: item.quantity, transaction });
  await inventory.reload({ transaction });

  if (inventory.quantity <= 0) {
    await inventory.destroy({ transaction });
  }
};

interface CreateTransferTransactionsParams {
  sourceRole: string;
  sourceName: string;
  destinationRole: string;
  destinationName: string;
  item: NormalizedItem;
  requestId: string;
  userId: string;
  transaction: Transaction;
}

const createTransferTransactions = async ({
  sourceRole,
  sourceName,
  destinationRole,
  destinationName,
  item,
  requestId,
  userId,
  transaction
}: CreateTransferTransactionsParams): Promise<void> => {
  if (!item.product_id) {
    throw new Error('Product ID is required for transfer transaction');
  }

  const baseNote = `${item.product_name} (${item.quantity})`;

  await InventoryTransaction.create({
    id: uuidv4(),
    product_id: item.product_id,
    transaction_type: 'transfer',
    quantity: -item.quantity,
    reference: requestId,
    related_stock_request_id: requestId,
    created_by: userId,
    notes: `Transfer-out ${baseNote} from ${sourceRole === 'super-admin' ? 'Super Admin' : sourceName}`
  }, { transaction });

  if (destinationRole === 'admin') {
    await InventoryTransaction.create({
      id: uuidv4(),
      product_id: item.product_id,
      transaction_type: 'transfer',
      quantity: item.quantity,
      reference: requestId,
      related_stock_request_id: requestId,
      created_by: userId,
      notes: `Transfer-in ${baseNote} to ${destinationName}`
    }, { transaction });
  } else if (destinationRole === 'agent') {
    await InventoryTransaction.create({
      id: uuidv4(),
      product_id: item.product_id,
      transaction_type: 'transfer',
      quantity: item.quantity,
      reference: requestId,
      related_stock_request_id: requestId,
      created_by: userId,
      notes: `Issued ${baseNote} to agent ${destinationName}`
    }, { transaction });
  }
};

// Dispatch stock request
export const dispatchStockRequest = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    if (!req.user) {
      await transaction.rollback();
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { id } = req.params;
    const { rejection_reason } = req.body;

    // Lock the stock request first without include (PostgreSQL doesn't allow FOR UPDATE with LEFT OUTER JOIN)
    const request = await StockRequest.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!request) {
      await transaction.rollback();
      res.status(404).json({ error: 'Stock request not found' });
      return;
    }

    if (request.status !== 'pending') {
      await transaction.rollback();
      res.status(400).json({ error: `Cannot dispatch request. Current status: ${request.status}` });
      return;
    }

    // Determine if user can dispatch
    // Super-admin can dispatch any request
    // Admin can dispatch if:
    //   1. Request is from super-admin (admin is dispatching to themselves or agent)
    //   2. Request is from another admin and they are the source (admin-to-admin transfer)
    //   3. Request is from agent with requested_from="admin" (any admin can dispatch to their agents)
    const canDispatch =
      req.user.role === 'super-admin' ||
      (req.user.role === 'admin' &&
       (request.requested_from_role === 'super-admin' ||
        (request.requested_from_role === 'admin' && request.requested_from === req.user.id) ||
        (request.requested_by_role === 'agent' && request.requested_from === 'admin')));

    if (!canDispatch) {
      await transaction.rollback();
      res.status(403).json({ error: 'You do not have permission to dispatch this request' });
      return;
    }

    // Fetch items separately after locking the request
    const items = await StockRequestItem.findAll({
      where: { stock_request_id: id },
      transaction
    });

    if (rejection_reason) {
      await request.update({
        status: 'rejected',
        rejection_reason
      }, { transaction });

      await transaction.commit();

      const updated = await StockRequest.findByPk(id, {
        include: buildRequestIncludes()
      });

      res.json(updated);
      return;
    }

    if (!items.length) {
      await transaction.rollback();
      res.status(400).json({ error: 'Stock request has no line items' });
      return;
    }

    for (const item of items) {
      if (!item.product_id) {
        await transaction.rollback();
        res.status(400).json({ error: `Cannot dispatch item ${item.id} without a linked product` });
        return;
      }
    }

    // Determine the actual source admin ID
    // If requested_from is "admin" (placeholder for agent requests), use the dispatching admin's ID
    const actualSourceAdminId =
      request.requested_from === 'admin' && req.user.role === 'admin'
        ? req.user.id
        : request.requested_from;

    const sourceName =
      request.requested_from_role === 'super-admin'
        ? 'Super Admin'
        : request.requested_from === 'admin'
        ? req.user.name
        : (await User.findByPk(request.requested_from, { transaction }))?.name || 'Unknown Admin';

    if (request.requested_from_role === 'super-admin') {
      for (const item of items) {
        if (!item.product_id) continue;
        const product = await Product.findByPk(item.product_id, { transaction, lock: transaction.LOCK.UPDATE });

        if (!product || product.quantity < item.quantity) {
          await transaction.rollback();
          res.status(400).json({ error: `Insufficient stock for product ${item.product_name} in central inventory` });
          return;
        }
      }

      for (const item of items) {
        if (!item.product_id) continue;
        const product = await Product.findByPk(item.product_id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!product) {
          await transaction.rollback();
          res.status(400).json({ error: `Product ${item.product_id} not found` });
          return;
        }
        await product.decrement('quantity', { by: item.quantity, transaction });

        if (request.requested_by_role === 'admin' && request.requested_by_id) {
          await adjustAdminInventory(request.requested_by_id, item.product_id, item.quantity, transaction);
        }
      }
    } else {
      // Use actualSourceAdminId for admin-to-admin or admin-to-agent transfers
      const normalizedItems: NormalizedItem[] = items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        model: item.model,
        quantity: item.quantity
      }));
      await ensureSourceAdminInventory(actualSourceAdminId, normalizedItems, transaction);

      for (const item of items) {
        const normalizedItem: NormalizedItem = {
          product_id: item.product_id,
          product_name: item.product_name,
          model: item.model,
          quantity: item.quantity
        };
        await decrementAdminInventory(actualSourceAdminId, normalizedItem, transaction);

        if (request.requested_by_role === 'admin' && request.requested_by_id && item.product_id) {
          await adjustAdminInventory(request.requested_by_id, item.product_id, item.quantity, transaction);
        }
      }
    }

    const dispatchImage = req.file ? `/uploads/${req.file.filename}` : request.dispatch_image;

    // Update request with dispatch info
    // If requested_from was "admin" (placeholder), update it to the actual admin ID
    const updateData: any = {
      status: 'dispatched',
      dispatched_by_id: req.user.id,
      dispatched_by_name: req.user.name,
      dispatched_date: new Date(),
      dispatch_image: dispatchImage,
      rejection_reason: null
    };

    // If this was an agent request with "admin" placeholder, update to actual admin ID
    if (request.requested_from === 'admin' && req.user.role === 'admin') {
      updateData.requested_from = req.user.id;
    }

    await request.update(updateData, { transaction });

    for (const item of items) {
      if (!item.product_id) continue;
      const normalizedItem: NormalizedItem = {
        product_id: item.product_id,
        product_name: item.product_name,
        model: item.model,
        quantity: item.quantity
      };
      await createTransferTransactions({
        sourceRole: request.requested_from_role,
        sourceName,
        destinationRole: request.requested_by_role,
        destinationName: request.requested_by_name,
        item: normalizedItem,
        requestId: request.id,
        userId: req.user.id,
        transaction
      });
    }

    await transaction.commit();

    const updated = await StockRequest.findByPk(id, {
      include: buildRequestIncludes()
    });

    if (!updated) {
      await transaction.rollback();
      res.status(500).json({ error: 'Failed to retrieve updated request' });
      return;
    }

    logInfo('Stock request dispatched', { requestId: id, dispatchedBy: req.user.id, status: updated.status });
    res.json(updated);
  } catch (error: any) {
    await transaction.rollback();
    logError('Dispatch stock request error', error, { requestId: req.params.id, dispatchedBy: req.user?.id });
    res.status(400).json({ error: error.message || 'Unable to dispatch stock request' });
  }
};

// Confirm stock request receipt
export const confirmStockRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { id } = req.params;

    const request = await StockRequest.findByPk(id);
    if (!request) {
      res.status(404).json({ error: 'Stock request not found' });
      return;
    }

    if (request.status !== 'dispatched') {
      res.status(400).json({
        error: `Cannot confirm request. Current status: ${request.status}`
      });
      return;
    }

    const canConfirm = request.requested_by_id === req.user.id;
    if (!canConfirm) {
      res.status(403).json({
        error: 'You do not have permission to confirm this request'
      });
      return;
    }

    const confirmationImage = req.file ? `/uploads/${req.file.filename}` : request.confirmation_image;
    await request.update({
      status: 'confirmed',
      confirmed_by_id: req.user.id,
      confirmed_by_name: req.user.name,
      confirmed_date: new Date(),
      confirmation_image: confirmationImage
    });

    const updated = await StockRequest.findByPk(id, {
      include: buildRequestIncludes()
    });

    logInfo('Stock request confirmed', { requestId: id, confirmedBy: req.user.id });
    res.json(updated);
  } catch (error) {
    logError('Confirm stock request error', error, { requestId: req.params.id, confirmedBy: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
};

// Update stock request
export const updateStockRequest = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    if (!req.user) {
      await transaction.rollback();
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { id } = req.params;
    const { items: rawItems, notes } = req.body;

    // Lock the stock request first without include (PostgreSQL doesn't allow FOR UPDATE with LEFT OUTER JOIN)
    const request = await StockRequest.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!request) {
      await transaction.rollback();
      res.status(404).json({ error: 'Stock request not found' });
      return;
    }

    if (request.status !== 'pending') {
      await transaction.rollback();
      res.status(400).json({ error: 'Can only update pending requests' });
      return;
    }

    const canUpdate = request.requested_by_id === req.user.id;
    if (!canUpdate) {
      await transaction.rollback();
      res.status(403).json({ error: 'You do not have permission to update this request' });
      return;
    }

    const updates: any = {};

    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (rawItems) {
      let parsedItems = rawItems;
      if (typeof parsedItems === 'string') {
        try {
          parsedItems = JSON.parse(parsedItems);
        } catch (parseError) {
          await transaction.rollback();
          res.status(400).json({ error: 'items must be a JSON array' });
          return;
        }
      }

      const normalizedItems = await normalizeItemsPayload(parsedItems, transaction);
      const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
      const primaryItem = normalizedItems[0];

      updates.total_quantity = totalQuantity;
      updates.primary_product_id = primaryItem.product_id;
      updates.primary_product_name = primaryItem.product_name;
      updates.primary_model = primaryItem.model;

      await StockRequestItem.destroy({
        where: { stock_request_id: id },
        transaction
      });

      await attachStockRequestItems(id, normalizedItems, transaction);
    }

    await request.update(updates, { transaction });

    await transaction.commit();

    const updated = await StockRequest.findByPk(id, {
      include: buildRequestIncludes()
    });

    logInfo('Stock request updated', { requestId: id, updatedBy: req.user.id });
    res.json(updated);
  } catch (error: any) {
    await transaction.rollback();
    logError('Update stock request error', error, { requestId: req.params.id, updatedBy: req.user?.id });
    res.status(400).json({ error: error.message || 'Unable to update stock request' });
  }
};

// Delete stock request
export const deleteStockRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { id } = req.params;

    const request = await StockRequest.findByPk(id);
    if (!request) {
      res.status(404).json({ error: 'Stock request not found' });
      return;
    }

    if (request.status !== 'pending') {
      res.status(400).json({
        error: 'Can only delete pending requests'
      });
      return;
    }

    const canDelete =
      request.requested_by_id === req.user.id ||
      req.user.role === 'super-admin';

    if (!canDelete) {
      res.status(403).json({
        error: 'You do not have permission to delete this request'
      });
      return;
    }

    await StockRequestItem.destroy({ where: { stock_request_id: id } });
    await request.destroy();
    logInfo('Stock request deleted', { requestId: id, deletedBy: req.user.id });
    res.json({ message: 'Stock request deleted successfully' });
  } catch (error) {
    logError('Delete stock request error', error, { requestId: req.params.id, deletedBy: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
};

