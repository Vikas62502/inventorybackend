import express, { Router } from 'express';
import { login, refreshToken, logout, changePassword } from '../controllers/quotationAuthController';
import { authenticate } from '../middleware/authQuotation';
import { validate } from '../middleware/validate';
import { loginSchema, changePasswordSchema } from '../validations/quotationAuthValidations';

const router: Router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login (dealer/visitor)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 */
router.post('/login', validate(loginSchema), login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.post('/refresh', refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout', authenticate, logout);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.put('/change-password', authenticate, validate(changePasswordSchema), changePassword);

export default router;

