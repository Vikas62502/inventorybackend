import express, { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

// Only privileged roles can manage users
router.get('/', authorize('super-admin', 'admin'), getAllUsers);
router.get('/:id', authorize('super-admin', 'admin'), getUserById);
router.post('/', authorize('super-admin', 'admin'), createUser);
router.put('/:id', authorize('super-admin'), updateUser);
router.delete('/:id', authorize('super-admin'), deleteUser);

export default router;

