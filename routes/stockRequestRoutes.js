const express = require('express');
const router = express.Router();
const {
  getAllStockRequests,
  getStockRequestById,
  createStockRequest,
  dispatchStockRequest,
  confirmStockRequest,
  updateStockRequest,
  deleteStockRequest
} = require('../controllers/stockRequestController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

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

module.exports = router;






