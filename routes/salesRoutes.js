const express = require('express');
const router = express.Router();
const {
  getAllSales,
  getSaleById,
  createSale,
  updateSale,
  confirmB2BBill,
  deleteSale,
  getSalesSummary
} = require('../controllers/salesController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// Get routes
router.get('/', getAllSales);
router.get('/summary', getSalesSummary);
router.get('/:id', getSaleById);

// Create - agents and admins can create sales
router.post('/', authorize('agent', 'admin'), upload.single('image'), createSale);

// Update - creator, admin, or super-admin can update
router.put('/:id', upload.single('image'), updateSale);

// Confirm B2B bill - only account role
router.post('/:id/confirm-bill', authorize('account'), upload.single('bill_image'), confirmB2BBill);

// Delete - creator or super-admin can delete
router.delete('/:id', deleteSale);

module.exports = router;






