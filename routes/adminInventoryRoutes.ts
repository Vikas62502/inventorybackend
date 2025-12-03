import express, { Router } from 'express';
import {
  getAllAdminInventory,
  getAdminInventoryById,
  getAdminInventoryByAdminId,
  upsertAdminInventory,
  updateAdminInventory,
  deleteAdminInventory
} from '../controllers/adminInventoryController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get routes - accessible by all authenticated users
router.get('/', getAllAdminInventory);
router.get('/admin/:adminId', getAdminInventoryByAdminId);
router.get('/:id', getAdminInventoryById);

// Create/Update routes - super-admin manages
router.post('/', authorize('super-admin'), upsertAdminInventory);
router.put('/:id', authorize('super-admin'), updateAdminInventory);
router.delete('/:id', authorize('super-admin'), deleteAdminInventory);

export default router;

