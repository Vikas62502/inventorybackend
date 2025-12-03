import express, { Router } from 'express';
import { login, getCurrentUser, forgotPassword, resetPassword, changePassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authenticate, changePassword);

export default router;

