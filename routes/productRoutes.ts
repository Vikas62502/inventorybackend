import express, { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventoryLevels
} from '../controllers/productController';
import { authenticate, authorize } from '../middleware/auth';
import upload from '../middleware/upload';

const router: Router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Protected routes
router.use(authenticate);

// Inventory levels - accessible to authenticated users
router.get('/inventory/levels', authenticate, getInventoryLevels);

// Super-admin manages products
router.post('/', authorize('super-admin'), upload.single('image'), createProduct);
router.put('/:id', authorize('super-admin'), upload.single('image'), updateProduct);
router.delete('/:id', authorize('super-admin'), deleteProduct);

export default router;

