const {
  StockRequest,
  StockRequestItem,
  Product,
  User,
  AdminInventory,
  InventoryTransaction
} = require('../models');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

// Helper function to generate next integer ID for stock requests
const getNextStockRequestId = async (transaction) => {
  const [results] = await sequelize.query(
    `SELECT id FROM stock_requests 
     WHERE id ~ '^[0-9]+$' 
     ORDER BY CAST(id AS INTEGER) DESC 
     LIMIT 1`,
    { transaction }
  );

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

const normalizeItemsPayload = async (rawItems, transaction) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('At least one line item is required');
  }

  const normalizedItems = [];

  for (const item of rawItems) {
    const quantity = Number(item.quantity);

    if (!quantity || quantity <= 0) {
      throw new Error('Each item must have a quantity greater than 0');
    }

    let productRecord = null;
    let productName = item.product_name;
    let model = item.model;
    let productId = item.product_id || null;

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

const attachStockRequestItems = async (stockRequestId, items, transaction) => {
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

// Get all stock requests
const getAllStockRequests = async (req, res) => {
  try {
    const { status, requested_by_id, requested_by, requested_from } = req.query;
    const where = {};

    if (status) {
      where.status = status;
    }

    if (requested_by_id || requested_by) {
      where.requested_by_id = requested_by_id || requested_by;
    }

    if (requested_from) {
      where.requested_from = requested_from;
    }

    const requests = await StockRequest.findAll({
      where,
      include: buildRequestIncludes(),
      order: [['requested_date', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    console.error('Get all stock requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get stock request by ID
const getStockRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await StockRequest.findByPk(id, {
      include: buildRequestIncludes()
    });

    if (!request) {
      return res.status(404).json({ error: 'Stock request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Get stock request by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create stock request
const createStockRequest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { items: rawItems, requested_from, notes } = req.body;
    let itemsPayload = rawItems;

    if (typeof itemsPayload === 'string') {
      try {
        itemsPayload = JSON.parse(itemsPayload);
      } catch (parseError) {
        throw new Error('items must be a JSON array');
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
      throw new Error('requested_from is required');
    }

    const normalizedItems = await normalizeItemsPayload(itemsPayload, transaction);
    const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);

    const requestedFromRole = requested_from === 'super-admin' ? 'super-admin' : 'admin';

    if (requestedFromRole === 'admin') {
      const fromUser = await User.findOne({
        where: { id: requested_from, role: 'admin' },
        transaction
      });

      if (!fromUser) {
        throw new Error('Requested from user not found or not an admin');
      }
    }

    const requestedByRole = req.user.role === 'admin' ? 'admin' : 'agent';
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

    res.status(201).json(created);
  } catch (error) {
    await transaction.rollback();
    console.error('Create stock request error:', error);
    res.status(400).json({ error: error.message || 'Unable to create stock request' });
  }
};

const adjustAdminInventory = async (adminId, productId, quantity, transaction) => {
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

const ensureSourceAdminInventory = async (adminId, items, transaction) => {
  for (const item of items) {
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

const decrementAdminInventory = async (adminId, item, transaction) => {
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

const createTransferTransactions = async ({
  sourceRole,
  sourceName,
  destinationRole,
  destinationName,
  item,
  requestId,
  userId,
  transaction
}) => {
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
const dispatchStockRequest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    // Lock the stock request first without include (PostgreSQL doesn't allow FOR UPDATE with LEFT OUTER JOIN)
    const request = await StockRequest.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!request) {
      throw new Error('Stock request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot dispatch request. Current status: ${request.status}`);
    }

    const canDispatch =
      req.user.role === 'super-admin' ||
      (req.user.role === 'admin' && request.requested_from_role === 'admin' && request.requested_from === req.user.id);

    if (!canDispatch) {
      throw new Error('You do not have permission to dispatch this request');
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

      return res.json(updated);
    }

    if (!items.length) {
      throw new Error('Stock request has no line items');
    }

    for (const item of items) {
      if (!item.product_id) {
        throw new Error(`Cannot dispatch item ${item.id} without a linked product`);
      }
    }

    const sourceName =
      request.requested_from_role === 'super-admin'
        ? 'Super Admin'
        : (await User.findByPk(request.requested_from, { transaction }))?.name || 'Unknown Admin';

    if (request.requested_from_role === 'super-admin') {
      for (const item of items) {
        const product = await Product.findByPk(item.product_id, { transaction, lock: transaction.LOCK.UPDATE });

        if (!product || product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.product_name} in central inventory`);
        }
      }

      for (const item of items) {
        const product = await Product.findByPk(item.product_id, { transaction, lock: transaction.LOCK.UPDATE });
        await product.decrement('quantity', { by: item.quantity, transaction });

        if (request.requested_by_role === 'admin' && request.requested_by_id) {
          await adjustAdminInventory(request.requested_by_id, item.product_id, item.quantity, transaction);
        }
      }
    } else {
      await ensureSourceAdminInventory(request.requested_from, items, transaction);

      for (const item of items) {
        await decrementAdminInventory(request.requested_from, item, transaction);

        if (request.requested_by_role === 'admin' && request.requested_by_id) {
          await adjustAdminInventory(request.requested_by_id, item.product_id, item.quantity, transaction);
        }
      }
    }

    const dispatchImage = req.file ? `/uploads/${req.file.filename}` : request.dispatch_image;

    await request.update({
      status: 'dispatched',
      dispatched_by_id: req.user.id,
      dispatched_by_name: req.user.name,
      dispatched_date: new Date(),
      dispatch_image: dispatchImage,
      rejection_reason: null
    }, { transaction });

    for (const item of items) {
      await createTransferTransactions({
        sourceRole: request.requested_from_role,
        sourceName,
        destinationRole: request.requested_by_role,
        destinationName: request.requested_by_name,
        item,
        requestId: request.id,
        userId: req.user.id,
        transaction
      });
    }

    await transaction.commit();

    const updated = await StockRequest.findByPk(id, {
      include: buildRequestIncludes()
    });

    res.json(updated);
  } catch (error) {
    await transaction.rollback();
    console.error('Dispatch stock request error:', error);
    res.status(400).json({ error: error.message || 'Unable to dispatch stock request' });
  }
};

// Confirm stock request receipt
const confirmStockRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await StockRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: 'Stock request not found' });
    }

    if (request.status !== 'dispatched') {
      return res.status(400).json({
        error: `Cannot confirm request. Current status: ${request.status}`
      });
    }

    const canConfirm = request.requested_by_id === req.user.id;
    if (!canConfirm) {
      return res.status(403).json({
        error: 'You do not have permission to confirm this request'
      });
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

    res.json(updated);
  } catch (error) {
    console.error('Confirm stock request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update stock request
const updateStockRequest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { items: rawItems, notes } = req.body;

    // Lock the stock request first without include (PostgreSQL doesn't allow FOR UPDATE with LEFT OUTER JOIN)
    const request = await StockRequest.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!request) {
      throw new Error('Stock request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Can only update pending requests');
    }

    const canUpdate = request.requested_by_id === req.user.id;
    if (!canUpdate) {
      throw new Error('You do not have permission to update this request');
    }

    let updates = {};

    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (rawItems) {
      let parsedItems = rawItems;
      if (typeof parsedItems === 'string') {
        try {
          parsedItems = JSON.parse(parsedItems);
        } catch (parseError) {
          throw new Error('items must be a JSON array');
        }
      }

      const normalizedItems = await normalizeItemsPayload(parsedItems, transaction);
      const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
      const primaryItem = normalizedItems[0];

      updates = {
        ...updates,
        total_quantity: totalQuantity,
        primary_product_id: primaryItem.product_id,
        primary_product_name: primaryItem.product_name,
        primary_model: primaryItem.model
      };

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

    res.json(updated);
  } catch (error) {
    await transaction.rollback();
    console.error('Update stock request error:', error);
    res.status(400).json({ error: error.message || 'Unable to update stock request' });
  }
};

// Delete stock request
const deleteStockRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await StockRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: 'Stock request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: 'Can only delete pending requests'
      });
    }

    const canDelete =
      request.requested_by_id === req.user.id ||
      req.user.role === 'super-admin';

    if (!canDelete) {
      return res.status(403).json({
        error: 'You do not have permission to delete this request'
      });
    }

    await StockRequestItem.destroy({ where: { stock_request_id: id } });
    await request.destroy();
    res.json({ message: 'Stock request deleted successfully' });
  } catch (error) {
    console.error('Delete stock request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllStockRequests,
  getStockRequestById,
  createStockRequest,
  dispatchStockRequest,
  confirmStockRequest,
  updateStockRequest,
  deleteStockRequest
};
