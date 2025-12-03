import { Request, Response } from 'express';
import { AdminInventory, User, Product } from '../models';
import { v4 as uuidv4 } from 'uuid';

// Get all admin inventory
export const getAllAdminInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { admin_id } = req.query;
    const where: any = {};

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
    const formattedInventory = inventory.map(item => {
      const itemAny = item as any;
      return {
        ...item.toJSON(),
        admin_name: itemAny.admin ? (itemAny.admin as User).name : null,
        product_name: itemAny.product ? (itemAny.product as Product).name : null,
        model: itemAny.product ? (itemAny.product as Product).model : null,
        wattage: itemAny.product ? (itemAny.product as Product).wattage : null,
        category_name: itemAny.product ? (itemAny.product as Product).category : null
      };
    });

    res.json(formattedInventory);
  } catch (error) {
    console.error('Get all admin inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get admin inventory by ID
export const getAdminInventoryById = async (req: Request, res: Response): Promise<void> => {
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
      res.status(404).json({ error: 'Admin inventory not found' });
      return;
    }

    const inventoryAny = inventory as any;
    const formatted = {
      ...inventory.toJSON(),
      admin_name: inventoryAny.admin ? (inventoryAny.admin as User).name : null,
      product_name: inventoryAny.product ? (inventoryAny.product as Product).name : null,
      model: inventoryAny.product ? (inventoryAny.product as Product).model : null,
      wattage: inventoryAny.product ? (inventoryAny.product as Product).wattage : null,
      category_name: inventoryAny.product ? (inventoryAny.product as Product).category : null
    };

    res.json(formatted);
  } catch (error) {
    console.error('Get admin inventory by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get inventory for specific admin
export const getAdminInventoryByAdminId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { adminId } = req.params;

    // Verify admin exists
    const admin = await User.findOne({
      where: { id: adminId, role: 'admin' },
      attributes: ['id', 'name', 'role']
    });

    if (!admin) {
      res.status(404).json({ error: 'Admin not found' });
      return;
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

    const formatted = inventory.map(item => {
      const itemAny = item as any;
      return {
        ...item.toJSON(),
        product_name: itemAny.product ? (itemAny.product as Product).name : null,
        model: itemAny.product ? (itemAny.product as Product).model : null,
        wattage: itemAny.product ? (itemAny.product as Product).wattage : null,
        category_name: itemAny.product ? (itemAny.product as Product).category : null
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get admin inventory by admin ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create or update admin inventory
export const upsertAdminInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { admin_id, product_id, quantity } = req.body;

    if (!admin_id || !product_id || quantity === undefined) {
      res.status(400).json({
        error: 'admin_id, product_id, and quantity are required'
      });
      return;
    }

    if (quantity < 0) {
      res.status(400).json({ error: 'Quantity cannot be negative' });
      return;
    }

    // Verify admin exists
    const admin = await User.findOne({
      where: { id: admin_id, role: 'admin' }
    });

    if (!admin) {
      res.status(400).json({ error: 'Admin not found' });
      return;
    }

    // Verify product exists
    const product = await Product.findByPk(product_id);
    if (!product) {
      res.status(400).json({ error: 'Product not found' });
      return;
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

      if (!updated) {
        res.status(500).json({ error: 'Failed to retrieve updated inventory' });
        return;
      }

      const updatedAny = updated as any;
      const formatted = {
        ...updated.toJSON(),
        admin_name: updatedAny.admin ? (updatedAny.admin as User).name : null,
        product_name: updatedAny.product ? (updatedAny.product as Product).name : null,
        model: updatedAny.product ? (updatedAny.product as Product).model : null,
        category_name: updatedAny.product ? (updatedAny.product as Product).category : null
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

      if (!created) {
        res.status(500).json({ error: 'Failed to retrieve created inventory' });
        return;
      }

      const createdAny = created as any;
      const formatted = {
        ...created.toJSON(),
        admin_name: createdAny.admin ? (createdAny.admin as User).name : null,
        product_name: createdAny.product ? (createdAny.product as Product).name : null,
        model: createdAny.product ? (createdAny.product as Product).model : null,
        category_name: createdAny.product ? (createdAny.product as Product).category : null
      };

      res.status(201).json(formatted);
    }
  } catch (error) {
    console.error('Upsert admin inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update admin inventory
export const updateAdminInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      res.status(400).json({ error: 'Quantity is required' });
      return;
    }

    if (quantity < 0) {
      res.status(400).json({ error: 'Quantity cannot be negative' });
      return;
    }

    const inventory = await AdminInventory.findByPk(id);
    if (!inventory) {
      res.status(404).json({ error: 'Admin inventory not found' });
      return;
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

    if (!updated) {
      res.status(500).json({ error: 'Failed to retrieve updated inventory' });
      return;
    }

    const updatedAny = updated as any;
    const formatted = {
      ...updated.toJSON(),
      admin_name: updatedAny.admin ? (updatedAny.admin as User).name : null,
      product_name: updatedAny.product ? (updatedAny.product as Product).name : null,
      model: updatedAny.product ? (updatedAny.product as Product).model : null,
      category_name: updatedAny.product ? (updatedAny.product as Product).category : null
    };

    res.json(formatted);
  } catch (error) {
    console.error('Update admin inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete admin inventory
export const deleteAdminInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const inventory = await AdminInventory.findByPk(id);
    if (!inventory) {
      res.status(404).json({ error: 'Admin inventory not found' });
      return;
    }

    await inventory.destroy();
    res.json({ message: 'Admin inventory deleted successfully' });
  } catch (error) {
    console.error('Delete admin inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

