const { Product, AdminInventory } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    const where = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { model: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await Product.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json(products);
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create product
const createProduct = async (req, res) => {
  try {
    const { name, model, wattage, category, quantity, unit_price, image } = req.body;

    if (!name || !model || !category) {
      return res.status(400).json({
        error: 'Name, model, and category are required'
      });
    }

    // Check if product with same name and model already exists
    const existingProduct = await Product.findOne({ where: { name, model } });

    if (existingProduct) {
      return res.status(400).json({
        error: 'Product with this name and model already exists'
      });
    }

    const id = uuidv4();
    const imagePath = req.file ? `/uploads/${req.file.filename}` : image;

    const newProduct = await Product.create({
      id,
      name,
      model,
      wattage: wattage || null,
      category,
      quantity: quantity || 0,
      unit_price: unit_price !== undefined ? unit_price : null,
      image: imagePath || null,
      created_by: req.user.id
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, model, wattage, category, quantity, unit_price, image } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updates = {};

    if (name) {
      updates.name = name;
    }

    if (model) {
      updates.model = model;
    }

    if (wattage !== undefined) {
      updates.wattage = wattage;
    }

    if (category) {
      updates.category = category;
    }

    if (quantity !== undefined) {
      if (quantity < 0) {
        return res.status(400).json({ error: 'Quantity cannot be negative' });
      }
      updates.quantity = quantity;
    }

    if (unit_price !== undefined) {
      if (unit_price < 0) {
        return res.status(400).json({ error: 'Unit price cannot be negative' });
      }
      updates.unit_price = unit_price;
    }

    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    } else if (image !== undefined) {
      updates.image = image;
    }

    // Check for duplicate name-model combination if name or model is being updated
    if (name || model) {
      const checkName = name || product.name;
      const checkModel = model || product.model;

      const existingProduct = await Product.findOne({
        where: { name: checkName, model: checkModel, id: { [Op.ne]: id } }
      });

      if (existingProduct) {
        return res.status(400).json({
          error: 'Product with this name and model combination already exists'
        });
      }
    }

    await product.update(updates);

    const updatedProduct = await Product.findByPk(id);

    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if product is in admin inventory
    const adminInventory = await AdminInventory.findOne({ where: { product_id: id } });

    if (adminInventory) {
      return res.status(400).json({
        error: 'Cannot delete product. It exists in admin inventory.'
      });
    }

    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get inventory levels (central + distributed)
const getInventoryLevels = async (req, res) => {
  try {
    const inventory = await Product.findAll({
      attributes: [
        'id',
        'name',
        'model',
        'category',
        'wattage',
        'unit_price',
        [sequelize.col('products.quantity'), 'central_stock'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('admin_inventory.quantity')), 0), 'distributed_stock'],
        [sequelize.literal('(products.quantity + COALESCE(SUM(admin_inventory.quantity), 0))'), 'total_stock']
      ],
      include: [{
        model: AdminInventory,
        as: 'adminInventory',
        attributes: [],
        required: false
      }],
      group: [
        'products.id',
        'products.name',
        'products.model',
        'products.category',
        'products.wattage',
        'products.unit_price',
        'products.quantity'
      ],
      order: [['name', 'ASC']],
      raw: true
    });

    res.json(inventory);
  } catch (error) {
    console.error('Get inventory levels error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventoryLevels
};
