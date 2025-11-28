const express = require('express');
const router = express.Router();
const {
  getAllAdminInventory,
  getAdminInventoryById,
  getAdminInventoryByAdminId,
  upsertAdminInventory,
  updateAdminInventory,
  deleteAdminInventory
} = require('../controllers/adminInventoryController');
const { authenticate, authorize } = require('../middleware/auth');

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

module.exports = router;






