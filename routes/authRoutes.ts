import express, { Router } from 'express';
import { login, getCurrentUser, forgotPassword, resetPassword, changePassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validations/authValidations';

const router: Router = express.Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, getCurrentUser);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

export default router;

