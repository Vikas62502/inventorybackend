import express, { Router } from 'express';
import {
  getAllStockReturns,
  getStockReturnById,
  createStockReturn,
  processStockReturn,
  updateStockReturn,
  deleteStockReturn
} from '../controllers/stockReturnController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get routes
router.get('/', getAllStockReturns);
router.get('/:id', getStockReturnById);

// Create - admins can create returns
router.post('/', authorize('admin'), createStockReturn);

// Process - super-admin processes returns
router.post('/:id/process', authorize('super-admin'), processStockReturn);

// Update - admin or super-admin can update pending returns
router.put('/:id', updateStockReturn);

// Delete - admin or super-admin can delete pending returns
router.delete('/:id', deleteStockReturn);

export default router;

