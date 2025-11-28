const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventoryLevels
} = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

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

module.exports = router;

