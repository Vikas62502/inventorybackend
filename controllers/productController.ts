import { Request, Response } from 'express';
import { Product, AdminInventory } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import sequelize from '../config/database';

// Get all products
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query;
    const where: any = {};

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
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create product
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, model, wattage, category, quantity, unit_price, image } = req.body;

    if (!name || !model || !category) {
      res.status(400).json({
        error: 'Name, model, and category are required'
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Check if product with same name and model already exists
    const existingProduct = await Product.findOne({ where: { name, model } });

    if (existingProduct) {
      res.status(400).json({
        error: 'Product with this name and model already exists'
      });
      return;
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
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, model, wattage, category, quantity, unit_price, image } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const updates: any = {};

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
        res.status(400).json({ error: 'Quantity cannot be negative' });
        return;
      }
      updates.quantity = quantity;
    }

    if (unit_price !== undefined) {
      if (unit_price < 0) {
        res.status(400).json({ error: 'Unit price cannot be negative' });
        return;
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
        res.status(400).json({
          error: 'Product with this name and model combination already exists'
        });
        return;
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
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Check if product is in admin inventory
    const adminInventory = await AdminInventory.findOne({ where: { product_id: id } });

    if (adminInventory) {
      res.status(400).json({
        error: 'Cannot delete product. It exists in admin inventory.'
      });
      return;
    }

    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get inventory levels (central + distributed)
export const getInventoryLevels = async (_req: Request, res: Response): Promise<void> => {
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

