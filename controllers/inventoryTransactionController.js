const { InventoryTransaction, Product, User, StockRequest, Sale } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Get all inventory transactions
const getAllInventoryTransactions = async (req, res) => {
  try {
    const { product_id, transaction_type, start_date, end_date } = req.query;
    const where = {};

    if (product_id) {
      where.product_id = product_id;
    }

    if (transaction_type) {
      where.transaction_type = transaction_type;
    }

    if (start_date || end_date) {
      where.timestamp = {};
      if (start_date) {
        where.timestamp[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        where.timestamp[Op.lte] = new Date(end_date);
      }
    }

    const transactions = await InventoryTransaction.findAll({
      where,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'model']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        },
        {
          model: StockRequest,
          as: 'relatedStockRequest',
          attributes: ['id', 'requested_by_name', 'requested_by_role', 'status'],
          required: false
        },
        {
          model: Sale,
          as: 'relatedSale',
          attributes: ['id', 'customer_name', 'type', 'payment_status'],
          required: false
        }
      ],
      order: [['timestamp', 'DESC']]
    });

    const formatted = transactions.map(txn => ({
      ...txn.toJSON(),
      product_name: txn.product ? txn.product.name : null,
      model: txn.product ? txn.product.model : null,
      created_by_name: txn.creator ? txn.creator.name : null,
      related_stock_request: txn.relatedStockRequest || null,
      related_sale: txn.relatedSale || null
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get all inventory transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get inventory transaction by ID
const getInventoryTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await InventoryTransaction.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'model']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        },
        {
          model: StockRequest,
          as: 'relatedStockRequest',
          attributes: ['id', 'requested_by_name', 'requested_by_role', 'status'],
          required: false
        },
        {
          model: Sale,
          as: 'relatedSale',
          attributes: ['id', 'customer_name', 'type', 'payment_status'],
          required: false
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Inventory transaction not found' });
    }

    const formatted = {
      ...transaction.toJSON(),
      product_name: transaction.product ? transaction.product.name : null,
      model: transaction.product ? transaction.product.model : null,
      created_by_name: transaction.creator ? transaction.creator.name : null,
      related_stock_request: transaction.relatedStockRequest || null,
      related_sale: transaction.relatedSale || null
    };

    res.json(formatted);
  } catch (error) {
    console.error('Get inventory transaction by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create inventory transaction (usually created automatically, but can be manual)
const createInventoryTransaction = async (req, res) => {
  try {
    const {
      product_id,
      transaction_type,
      quantity,
      reference,
      notes,
      related_stock_request_id,
      related_sale_id
    } = req.body;

    if (!product_id || !transaction_type || quantity === undefined) {
      return res.status(400).json({
        error: 'product_id, transaction_type, and quantity are required'
      });
    }

    const validTypes = ['purchase', 'sale', 'return', 'adjustment', 'transfer'];
    if (!validTypes.includes(transaction_type)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    // Verify product exists
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(400).json({ error: 'Product not found' });
    }

    const id = uuidv4();

    const newTransaction = await InventoryTransaction.create({
      id,
      product_id,
      transaction_type,
      quantity,
      reference: reference || null,
      related_stock_request_id: related_stock_request_id || null,
      related_sale_id: related_sale_id || null,
      notes: notes || null,
      created_by: req.user.id
    });

    const created = await InventoryTransaction.findByPk(newTransaction.id, {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'model']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        },
        {
          model: StockRequest,
          as: 'relatedStockRequest',
          attributes: ['id', 'requested_by_name', 'requested_by_role', 'status'],
          required: false
        },
        {
          model: Sale,
          as: 'relatedSale',
          attributes: ['id', 'customer_name', 'type', 'payment_status'],
          required: false
        }
      ]
    });

    const formatted = {
      ...created.toJSON(),
      product_name: created.product ? created.product.name : null,
      model: created.product ? created.product.model : null,
      created_by_name: created.creator ? created.creator.name : null,
      related_stock_request: created.relatedStockRequest || null,
      related_sale: created.relatedSale || null
    };

    res.status(201).json(formatted);
  } catch (error) {
    console.error('Create inventory transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllInventoryTransactions,
  getInventoryTransactionById,
  createInventoryTransaction
};
