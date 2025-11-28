const { StockReturn, User, Product, AdminInventory, InventoryTransaction } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Get all stock returns
const getAllStockReturns = async (req, res) => {
  try {
    const { admin_id, status, start_date, end_date } = req.query;
    const where = {};

    if (admin_id) {
      where.admin_id = admin_id;
    }

    if (status) {
      where.status = status;
    }

    if (start_date || end_date) {
      where.return_date = {};
      if (start_date) {
        where.return_date[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        where.return_date[Op.lte] = new Date(end_date);
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

    const formatted = returns.map(ret => ({
      ...ret.toJSON(),
      admin_name: ret.admin ? ret.admin.name : null,
      product_name: ret.product ? ret.product.name : null,
      model: ret.product ? ret.product.model : null,
      processed_by_name: ret.processor ? ret.processor.name : null
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get all stock returns error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get stock return by ID
const getStockReturnById = async (req, res) => {
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
      return res.status(404).json({ error: 'Stock return not found' });
    }

    const formatted = {
      ...returnRecord.toJSON(),
      admin_name: returnRecord.admin ? returnRecord.admin.name : null,
      product_name: returnRecord.product ? returnRecord.product.name : null,
      model: returnRecord.product ? returnRecord.product.model : null,
      processed_by_name: returnRecord.processor ? returnRecord.processor.name : null
    };

    res.json(formatted);
  } catch (error) {
    console.error('Get stock return by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create stock return
const createStockReturn = async (req, res) => {
  try {
    const { product_id, quantity, reason, notes } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({
        error: 'product_id and quantity are required'
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    // Verify product exists
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(400).json({ error: 'Product not found' });
    }

    // Check if admin has enough stock
    const adminInventory = await AdminInventory.findOne({
      where: { admin_id: req.user.id, product_id }
    });

    if (!adminInventory || adminInventory.quantity < quantity) {
      return res.status(400).json({
        error: 'Insufficient stock in admin inventory'
      });
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

    const formatted = {
      ...created.toJSON(),
      admin_name: created.admin ? created.admin.name : null,
      product_name: created.product ? created.product.name : null,
      model: created.product ? created.product.model : null
    };

    res.status(201).json(formatted);
  } catch (error) {
    console.error('Create stock return error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Process stock return (Super Admin only)
const processStockReturn = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    // Get return details
    const returnRecord = await StockReturn.findByPk(id, { transaction });
    if (!returnRecord) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Stock return not found' });
    }

    if (returnRecord.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        error: `Return is already ${returnRecord.status}`
      });
    }

    // Only super admin can process returns
    if (req.user.role !== 'super-admin') {
      await transaction.rollback();
      return res.status(403).json({
        error: 'Only super admin can process stock returns'
      });
    }

    // Verify admin still has the stock
    const adminInventory = await AdminInventory.findOne({
      where: { admin_id: returnRecord.admin_id, product_id: returnRecord.product_id },
      transaction
    });

    if (!adminInventory || adminInventory.quantity < returnRecord.quantity) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Admin no longer has sufficient stock for this return'
      });
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

    const formatted = {
      ...updated.toJSON(),
      admin_name: updated.admin ? updated.admin.name : null,
      product_name: updated.product ? updated.product.name : null,
      model: updated.product ? updated.product.model : null,
      processed_by_name: updated.processor ? updated.processor.name : null
    };

    res.json(formatted);
  } catch (error) {
    await transaction.rollback();
    console.error('Process stock return error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update stock return
const updateStockReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason, notes } = req.body;

    const returnRecord = await StockReturn.findByPk(id);
    if (!returnRecord) {
      return res.status(404).json({ error: 'Stock return not found' });
    }

    if (returnRecord.status !== 'pending') {
      return res.status(400).json({
        error: 'Can only update pending returns'
      });
    }

    // Check permissions
    const canUpdate = 
      returnRecord.admin_id === req.user.id ||
      req.user.role === 'super-admin';

    if (!canUpdate) {
      return res.status(403).json({
        error: 'You do not have permission to update this return'
      });
    }

    const updates = {};

    if (quantity !== undefined) {
      if (quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than 0' });
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

    const formatted = {
      ...updated.toJSON(),
      admin_name: updated.admin ? updated.admin.name : null,
      product_name: updated.product ? updated.product.name : null,
      model: updated.product ? updated.product.model : null
    };

    res.json(formatted);
  } catch (error) {
    console.error('Update stock return error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete stock return
const deleteStockReturn = async (req, res) => {
  try {
    const { id } = req.params;

    const returnRecord = await StockReturn.findByPk(id);
    if (!returnRecord) {
      return res.status(404).json({ error: 'Stock return not found' });
    }

    // Only allow deletion of pending returns
    if (returnRecord.status !== 'pending') {
      return res.status(400).json({
        error: 'Can only delete pending returns'
      });
    }

    // Check permissions
    const canDelete = 
      returnRecord.admin_id === req.user.id ||
      req.user.role === 'super-admin';

    if (!canDelete) {
      return res.status(403).json({
        error: 'You do not have permission to delete this return'
      });
    }

    await returnRecord.destroy();
    res.json({ message: 'Stock return deleted successfully' });
  } catch (error) {
    console.error('Delete stock return error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllStockReturns,
  getStockReturnById,
  createStockReturn,
  processStockReturn,
  updateStockReturn,
  deleteStockReturn
};
