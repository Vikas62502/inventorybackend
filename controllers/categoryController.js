const { Product } = require('../models');
const { Op, fn, col } = require('sequelize');

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Product.findAll({
      attributes: [[fn('DISTINCT', col('category')), 'name']],
      where: {
        category: {
          [Op.ne]: null
        }
      },
      order: [[col('category'), 'ASC']],
      raw: true
    });

    res.json(categories.map((cat) => ({
      name: cat.name
    })));
  } catch (error) {
    console.error('Get all categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Product.findOne({
      where: {
        category: id
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ name: id });
  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    return res.status(400).json({
      error: 'Categories are derived from products. Assign the category when creating or updating a product.'
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Product.findOne({
      where: { category: id }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.status(400).json({
      error: 'Categories are read-only. Update product records to rename or reassign categories.'
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Product.findOne({
      where: { category: id }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.status(400).json({
      error: 'Categories cannot be deleted independently. Update or delete the associated products instead.'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
