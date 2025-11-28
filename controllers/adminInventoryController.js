const { AdminInventory, User, Product } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

// Get all admin inventory
const getAllAdminInventory = async (req, res) => {
  try {
    const { admin_id } = req.query;
    const where = {};

    if (admin_id) {
      where.admin_id = admin_id;
    }

    const inventory = await AdminInventory.findAll({
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
          attributes: ['id', 'name', 'model', 'category', 'wattage']
        }
      ],
      order: [
        [{ model: User, as: 'admin' }, 'name', 'ASC'],
        [{ model: Product, as: 'product' }, 'name', 'ASC']
      ]
    });

    // Format response
    const formattedInventory = inventory.map(item => ({
      ...item.toJSON(),
      admin_name: item.admin ? item.admin.name : null,
      product_name: item.product ? item.product.name : null,
      model: item.product ? item.product.model : null,
      wattage: item.product ? item.product.wattage : null,
      category_name: item.product ? item.product.category : null
    }));

    res.json(formattedInventory);
  } catch (error) {
    console.error('Get all admin inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get admin inventory by ID
const getAdminInventoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const inventory = await AdminInventory.findByPk(id, {
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'model', 'category', 'wattage']
        }
      ]
    });

    if (!inventory) {
      return res.status(404).json({ error: 'Admin inventory not found' });
    }

    const formatted = {
      ...inventory.toJSON(),
      admin_name: inventory.admin ? inventory.admin.name : null,
      product_name: inventory.product ? inventory.product.name : null,
      model: inventory.product ? inventory.product.model : null,
      wattage: inventory.product ? inventory.product.wattage : null,
      category_name: inventory.product ? inventory.product.category : null
    };

    res.json(formatted);
  } catch (error) {
    console.error('Get admin inventory by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get inventory for specific admin
const getAdminInventoryByAdminId = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Verify admin exists
    const admin = await User.findOne({
      where: { id: adminId, role: 'admin' },
      attributes: ['id', 'name', 'role']
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const inventory = await AdminInventory.findAll({
      where: { admin_id: adminId },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'model', 'category', 'wattage']
      }],
      order: [[{ model: Product, as: 'product' }, 'name', 'ASC']]
    });

    const formatted = inventory.map(item => ({
      ...item.toJSON(),
      product_name: item.product ? item.product.name : null,
      model: item.product ? item.product.model : null,
      wattage: item.product ? item.product.wattage : null,
      category_name: item.product ? item.product.category : null
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get admin inventory by admin ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create or update admin inventory
const upsertAdminInventory = async (req, res) => {
  try {
    const { admin_id, product_id, quantity } = req.body;

    if (!admin_id || !product_id || quantity === undefined) {
      return res.status(400).json({
        error: 'admin_id, product_id, and quantity are required'
      });
    }

    if (quantity < 0) {
      return res.status(400).json({ error: 'Quantity cannot be negative' });
    }

    // Verify admin exists
    const admin = await User.findOne({
      where: { id: admin_id, role: 'admin' }
    });

    if (!admin) {
      return res.status(400).json({ error: 'Admin not found' });
    }

    // Verify product exists
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(400).json({ error: 'Product not found' });
    }

    // Check if inventory entry exists
    const existing = await AdminInventory.findOne({
      where: { admin_id, product_id }
    });

    if (existing) {
      // Update existing
      await existing.update({ quantity });

      const updated = await AdminInventory.findByPk(existing.id, {
        include: [
          {
            model: User,
            as: 'admin',
            attributes: ['id', 'name']
          },
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'model', 'category']
          }
        ]
      });

      const formatted = {
        ...updated.toJSON(),
        admin_name: updated.admin ? updated.admin.name : null,
        product_name: updated.product ? updated.product.name : null,
        model: updated.product ? updated.product.model : null,
        category_name: updated.product ? updated.product.category : null
      };

      res.json(formatted);
    } else {
      // Create new
      const id = uuidv4();
      const newInventory = await AdminInventory.create({
        id,
        admin_id,
        product_id,
        quantity
      });

      const created = await AdminInventory.findByPk(newInventory.id, {
        include: [
          {
            model: User,
            as: 'admin',
            attributes: ['id', 'name']
          },
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'model', 'category']
          }
        ]
      });

      const formatted = {
        ...created.toJSON(),
        admin_name: created.admin ? created.admin.name : null,
        product_name: created.product ? created.product.name : null,
        model: created.product ? created.product.model : null,
        category_name: created.product ? created.product.category : null
      };

      res.status(201).json(formatted);
    }
  } catch (error) {
    console.error('Upsert admin inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update admin inventory
const updateAdminInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    if (quantity < 0) {
      return res.status(400).json({ error: 'Quantity cannot be negative' });
    }

    const inventory = await AdminInventory.findByPk(id);
    if (!inventory) {
      return res.status(404).json({ error: 'Admin inventory not found' });
    }

    await inventory.update({ quantity });

    const updated = await AdminInventory.findByPk(id, {
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'model', 'category']
        }
      ]
    });

    const formatted = {
      ...updated.toJSON(),
      admin_name: updated.admin ? updated.admin.name : null,
      product_name: updated.product ? updated.product.name : null,
      model: updated.product ? updated.product.model : null,
      category_name: updated.product ? updated.product.category : null
    };

    res.json(formatted);
  } catch (error) {
    console.error('Update admin inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete admin inventory
const deleteAdminInventory = async (req, res) => {
  try {
    const { id } = req.params;

    const inventory = await AdminInventory.findByPk(id);
    if (!inventory) {
      return res.status(404).json({ error: 'Admin inventory not found' });
    }

    await inventory.destroy();
    res.json({ message: 'Admin inventory deleted successfully' });
  } catch (error) {
    console.error('Delete admin inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllAdminInventory,
  getAdminInventoryById,
  getAdminInventoryByAdminId,
  upsertAdminInventory,
  updateAdminInventory,
  deleteAdminInventory
};
