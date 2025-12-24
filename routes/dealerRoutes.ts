import express, { Router } from 'express';
import { getDealerProfile, updateDealerProfile, getDealerStatistics } from '../controllers/dealerController';
import { authenticate, authorizeDealer } from '../middleware/authQuotation';
import { validate } from '../middleware/validate';
import { updateDealerSchema } from '../validations/dealerValidations';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(authorizeDealer);

/**
 * @swagger
 * /api/dealers/me:
 *   get:
 *     summary: Get dealer profile
 *     tags: [Dealers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', getDealerProfile);

/**
 * @swagger
 * /api/dealers/me:
 *   put:
 *     summary: Update dealer profile
 *     tags: [Dealers]
 *     security:
 *       - bearerAuth: []
 */
router.put('/me', validate(updateDealerSchema), updateDealerProfile);

/**
 * @swagger
 * /api/dealers/me/statistics:
 *   get:
 *     summary: Get dealer statistics
 *     tags: [Dealers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me/statistics', getDealerStatistics);

export default router;

