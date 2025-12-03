import express, { Router } from 'express';
import {
  getAllStockRequests,
  getStockRequestById,
  createStockRequest,
  dispatchStockRequest,
  confirmStockRequest,
  updateStockRequest,
  deleteStockRequest
} from '../controllers/stockRequestController';
import { authenticate, authorize } from '../middleware/auth';
import upload from '../middleware/upload';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get routes
router.get('/', getAllStockRequests);
router.get('/:id', getStockRequestById);

// Create - admins and agents can create requests
router.post('/', authorize('admin', 'agent'), createStockRequest);

// Dispatch - super-admin and admins can dispatch
router.post('/:id/dispatch', authorize('super-admin', 'admin'), upload.single('dispatch_image'), dispatchStockRequest);

// Confirm - requester can confirm
router.post('/:id/confirm', upload.single('confirmation_image'), confirmStockRequest);

// Update - requester can update pending requests
router.put('/:id', updateStockRequest);

// Delete - requester or super-admin can delete pending requests
router.delete('/:id', deleteStockRequest);

export default router;

