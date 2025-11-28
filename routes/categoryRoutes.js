const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes (no auth required)
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Protected routes
router.use(authenticate);

// Only super-admin and admin can manage categories
router.post('/', authorize('super-admin', 'admin'), createCategory);
router.put('/:id', authorize('super-admin', 'admin'), updateCategory);
router.delete('/:id', authorize('super-admin'), deleteCategory);

module.exports = router;






