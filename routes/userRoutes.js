const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Only privileged roles can manage users
router.get('/', authorize('super-admin', 'admin'), getAllUsers);
router.get('/:id', authorize('super-admin', 'admin'), getUserById);
router.post('/', authorize('super-admin', 'admin'), createUser);
router.put('/:id', authorize('super-admin'), updateUser);
router.delete('/:id', authorize('super-admin'), deleteUser);

module.exports = router;



