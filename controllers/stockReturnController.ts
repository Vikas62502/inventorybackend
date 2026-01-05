import { Request, Response } from 'express';
import { StockReturn, User, Product, AdminInventory, InventoryTransaction } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { logError, logInfo } from '../utils/loggerHelper';

// Get all stock returns (with role-based filtering)
export const getAllStockReturns = async (req: Request, res: Response): Promise<void> => {
  try {
    const { admin_id, status, start_date, end_date } = req.query;
    const where: any = {};

    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === 'agent') {
      // Agents currently do not create returns; deny listing for now
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (userRole === 'admin') {
      // Admins see only their own returns
      where.admin_id = userId;
    }
    // Super-admin and account roles see all returns (optionally filtered by query params)

    if (admin_id) {
      where.admin_id = admin_id;
    }

    if (status) {
      where.status = status;
    }

    if (start_date || end_date) {
      where.return_date = {};
      if (start_date) {
        where.return_date[Op.gte] = new Date(start_date as string);
      }
      if (end_date) {
        where.return_date[Op.lte] = new Date(end_date as string);
      }
    }

    const returns = await StockReturn.findAll({
      where,
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'model']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['return_date', 'DESC']]
    });

    const formatted = returns.map(ret => {
      const retAny = ret as any;
      return {
        ...ret.toJSON(),
        admin_name: retAny.admin ? (retAny.admin as User).name : null,
        product_name: retAny.product ? (retAny.product as Product).name : null,
        model: retAny.product ? (retAny.product as Product).model : null,
        processed_by_name: retAny.processor ? (retAny.processor as User).name : null
      };
    });

    logInfo('Get all stock returns', { count: formatted.length, status: status as string || 'all' });
    res.json(formatted);
  } catch (error) {
    logError('Get all stock returns error', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get stock return by ID
export const getStockReturnById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const returnRecord = await StockReturn.findByPk(id, {
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'model']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    if (!returnRecord) {
      res.status(404).json({ error: 'Stock return not found' });
      return;
    }

    const returnRecordAny = returnRecord as any;
    const formatted = {
      ...returnRecord.toJSON(),
      admin_name: returnRecordAny.admin ? (returnRecordAny.admin as User).name : null,
      product_name: returnRecordAny.product ? (returnRecordAny.product as Product).name : null,
      model: returnRecordAny.product ? (returnRecordAny.product as Product).model : null,
      processed_by_name: returnRecordAny.processor ? (returnRecordAny.processor as User).name : null
    };

    logInfo('Get stock return by ID', { returnId: id });
    res.json(formatted);
  } catch (error) {
    logError('Get stock return by ID error', error, { returnId: req.params.id });
    res.status(500).json({ error: 'Server error' });
  }
};

// Create stock return
export const createStockReturn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { product_id, quantity, reason, notes } = req.body;

    if (!product_id || !quantity) {
      res.status(400).json({
        error: 'product_id and quantity are required'
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (quantity <= 0) {
      res.status(400).json({ error: 'Quantity must be greater than 0' });
      return;
    }

    // Verify product exists
    const product = await Product.findByPk(product_id);
    if (!product) {
      res.status(400).json({ error: 'Product not found' });
      return;
    }

    // Check if admin has enough stock
    const adminInventory = await AdminInventory.findOne({
      where: { admin_id: req.user.id, product_id }
    });

    if (!adminInventory || adminInventory.quantity < quantity) {
      res.status(400).json({
        error: 'Insufficient stock in admin inventory'
      });
      return;
    }

    const id = uuidv4();

    // Create return record
    const newReturn = await StockReturn.create({
      id,
      admin_id: req.user.id,
      product_id,
      quantity,
      reason: reason || null,
      notes: notes || null,
      status: 'pending'
    });

    const created = await StockReturn.findByPk(newReturn.id, {
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'model']
        }
      ]
    });

    if (!created) {
      res.status(500).json({ error: 'Failed to retrieve created return' });
      return;
    }

    const createdAny = created as any;
    const formatted = {
      ...created.toJSON(),
      admin_name: createdAny.admin ? (createdAny.admin as User).name : null,
      product_name: createdAny.product ? (createdAny.product as Product).name : null,
      model: createdAny.product ? (createdAny.product as Product).model : null
    };

    logInfo('Stock return created', { returnId: newReturn.id, adminId: req.user.id, productId: product_id, quantity });
    res.status(201).json(formatted);
  } catch (error) {
    logError('Create stock return error', error, { adminId: req.user?.id, productId: req.body.product_id });
    res.status(500).json({ error: 'Server error' });
  }
};

// Process stock return (Super Admin only)
export const processStockReturn = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    if (!req.user) {
      await transaction.rollback();
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get return details
    const returnRecord = await StockReturn.findByPk(id, { transaction });
    if (!returnRecord) {
      await transaction.rollback();
      res.status(404).json({ error: 'Stock return not found' });
      return;
    }

    if (returnRecord.status !== 'pending') {
      await transaction.rollback();
      res.status(400).json({
        error: `Return is already ${returnRecord.status}`
      });
      return;
    }

    // Only super admin can process returns
    if (req.user.role !== 'super-admin') {
      await transaction.rollback();
      res.status(403).json({
        error: 'Only super admin can process stock returns'
      });
      return;
    }

    // Verify admin still has the stock
    const adminInventory = await AdminInventory.findOne({
      where: { admin_id: returnRecord.admin_id, product_id: returnRecord.product_id },
      transaction
    });

    if (!adminInventory || adminInventory.quantity < returnRecord.quantity) {
      await transaction.rollback();
      res.status(400).json({
        error: 'Admin no longer has sufficient stock for this return'
      });
      return;
    }

    // Reduce from admin inventory
    await adminInventory.decrement('quantity', { by: returnRecord.quantity, transaction });

    // Remove if quantity becomes 0
    const updatedInventory = await AdminInventory.findByPk(adminInventory.id, { transaction });
    if (updatedInventory && updatedInventory.quantity <= 0) {
      await adminInventory.destroy({ transaction });
    }

    // Add to central inventory
    const product = await Product.findByPk(returnRecord.product_id, { transaction });
    if (!product) {
      await transaction.rollback();
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    await product.increment('quantity', { by: returnRecord.quantity, transaction });

    // Update return status
    await returnRecord.update({
      status: 'completed',
      processed_by: req.user.id,
      processed_date: new Date()
    }, { transaction });

    // Log transaction
    const transactionId = uuidv4();
    await InventoryTransaction.create({
      id: transactionId,
      product_id: returnRecord.product_id,
      transaction_type: 'return',
      quantity: returnRecord.quantity,
      reference: id,
      related_stock_request_id: null,
      related_sale_id: null,
      created_by: req.user.id,
      notes: `Stock return ${id} processed`
    }, { transaction });

    await transaction.commit();

    const updated = await StockReturn.findByPk(id, {
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'model']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!updated) {
      res.status(500).json({ error: 'Failed to retrieve updated return' });
      return;
    }

    const updatedAny = updated as any;
    const formatted = {
      ...updated.toJSON(),
      admin_name: updatedAny.admin ? (updatedAny.admin as User).name : null,
      product_name: updatedAny.product ? (updatedAny.product as Product).name : null,
      model: updatedAny.product ? (updatedAny.product as Product).model : null,
      processed_by_name: updatedAny.processor ? (updatedAny.processor as User).name : null
    };

    logInfo('Stock return processed', { returnId: id, processedBy: req.user.id, productId: returnRecord.product_id, quantity: returnRecord.quantity });
    res.json(formatted);
  } catch (error) {
    await transaction.rollback();
    logError('Process stock return error', error, { returnId: req.params.id, processedBy: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
};

// Update stock return
export const updateStockReturn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity, reason, notes } = req.body;

    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const returnRecord = await StockReturn.findByPk(id);
    if (!returnRecord) {
      res.status(404).json({ error: 'Stock return not found' });
      return;
    }

    if (returnRecord.status !== 'pending') {
      res.status(400).json({
        error: 'Can only update pending returns'
      });
      return;
    }

    // Check permissions
    const canUpdate = 
      returnRecord.admin_id === req.user.id ||
      req.user.role === 'super-admin';

    if (!canUpdate) {
      res.status(403).json({
        error: 'You do not have permission to update this return'
      });
      return;
    }

    const updates: any = {};

    if (quantity !== undefined) {
      if (quantity <= 0) {
        res.status(400).json({ error: 'Quantity must be greater than 0' });
        return;
      }
      updates.quantity = quantity;
    }

    if (reason !== undefined) {
      updates.reason = reason;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    await returnRecord.update(updates);

    const updated = await StockReturn.findByPk(id, {
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'model']
        }
      ]
    });

    if (!updated) {
      res.status(500).json({ error: 'Failed to retrieve updated return' });
      return;
    }

    const updatedAny = updated as any;
    const formatted = {
      ...updated.toJSON(),
      admin_name: updatedAny.admin ? (updatedAny.admin as User).name : null,
      product_name: updatedAny.product ? (updatedAny.product as Product).name : null,
      model: updatedAny.product ? (updatedAny.product as Product).model : null
    };

    logInfo('Stock return updated', { returnId: id, updatedBy: req.user.id, updates: Object.keys(updates) });
    res.json(formatted);
  } catch (error) {
    logError('Update stock return error', error, { returnId: req.params.id, updatedBy: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete stock return
export const deleteStockReturn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const returnRecord = await StockReturn.findByPk(id);
    if (!returnRecord) {
      res.status(404).json({ error: 'Stock return not found' });
      return;
    }

    // Only allow deletion of pending returns
    if (returnRecord.status !== 'pending') {
      res.status(400).json({
        error: 'Can only delete pending returns'
      });
      return;
    }

    // Check permissions
    const canDelete = 
      returnRecord.admin_id === req.user.id ||
      req.user.role === 'super-admin';

    if (!canDelete) {
      res.status(403).json({
        error: 'You do not have permission to delete this return'
      });
      return;
    }

    await returnRecord.destroy();
    logInfo('Stock return deleted', { returnId: id, adminId: returnRecord.admin_id, deletedBy: req.user.id });
    res.json({ message: 'Stock return deleted successfully' });
  } catch (error) {
    logError('Delete stock return error', error, { returnId: req.params.id, deletedBy: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
};

