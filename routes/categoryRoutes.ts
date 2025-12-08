import express, { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

// Public routes (no auth required)
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Protected routes
router.use(authenticate);

// Only super-admin and admin can manage categories
router.post('/', authorize('super-admin', 'admin'), createCategory);
router.put('/:id', authorize('super-admin', 'admin'), updateCategory);
router.delete('/:id', authorize('super-admin'), deleteCategory);

export default router;


