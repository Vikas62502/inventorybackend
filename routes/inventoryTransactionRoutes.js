const express = require('express');
const router = express.Router();
const {
  getAllInventoryTransactions,
  getInventoryTransactionById,
  createInventoryTransaction
} = require('../controllers/inventoryTransactionController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get routes - all authenticated users can view
router.get('/', getAllInventoryTransactions);
router.get('/:id', getInventoryTransactionById);

// Create - super-admin and admin can create manual transactions
router.post('/', authorize('super-admin', 'admin'), createInventoryTransaction);

module.exports = router;






