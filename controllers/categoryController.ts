import { Request, Response } from 'express';
import { Product } from '../models';
import { Op, fn, col } from 'sequelize';
import { logError, logInfo } from '../utils/loggerHelper';

// Get all categories
export const getAllCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Product.findAll({
      attributes: [[fn('DISTINCT', col('category')), 'name']],
      where: {
        category: {
          [Op.ne]: null as any
        }
      },
      order: [[col('category'), 'ASC']],
      raw: true
    });

    const result = categories.map((cat: any) => ({
      name: cat.name
    }));
    logInfo('Get all categories', { count: result.length });
    res.json(result);
  } catch (error) {
    logError('Get all categories error', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get category by ID
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Product.findOne({
      where: {
        category: id
      }
    });

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    logInfo('Get category by ID', { categoryId: id });
    res.json({ name: id });
  } catch (error) {
    logError('Get category by ID error', error, { categoryId: req.params.id });
    res.status(500).json({ error: 'Server error' });
  }
};

// Create category
export const createCategory = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(400).json({
      error: 'Categories are derived from products. Assign the category when creating or updating a product.'
    });
  } catch (error) {
    logError('Create category error', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update category
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Product.findOne({
      where: { category: id }
    });

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.status(400).json({
      error: 'Categories are read-only. Update product records to rename or reassign categories.'
    });
  } catch (error) {
    logError('Update category error', error, { categoryId: req.params.id });
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete category
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Product.findOne({
      where: { category: id }
    });

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.status(400).json({
      error: 'Categories cannot be deleted independently. Update or delete the associated products instead.'
    });
  } catch (error) {
    logError('Delete category error', error, { categoryId: req.params.id });
    res.status(500).json({ error: 'Server error' });
  }
};

