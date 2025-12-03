import express, { Router } from 'express';
import {
  getAllInventoryTransactions,
  getInventoryTransactionById,
  createInventoryTransaction
} from '../controllers/inventoryTransactionController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get routes - all authenticated users can view
router.get('/', getAllInventoryTransactions);
router.get('/:id', getInventoryTransactionById);

// Create - super-admin and admin can create manual transactions
router.post('/', authorize('super-admin', 'admin'), createInventoryTransaction);

export default router;

