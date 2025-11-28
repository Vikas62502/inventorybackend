const express = require('express');
const router = express.Router();
const {
  getAllStockReturns,
  getStockReturnById,
  createStockReturn,
  processStockReturn,
  updateStockReturn,
  deleteStockReturn
} = require('../controllers/stockReturnController');
const { authenticate, authorize } = require('../middleware/auth');

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

module.exports = router;






