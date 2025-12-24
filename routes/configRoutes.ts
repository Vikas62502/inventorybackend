import express, { Router } from 'express';
import { getProductCatalog, getIndianStates } from '../controllers/configController';
import { authenticate } from '../middleware/authQuotation';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/config/products:
 *   get:
 *     summary: Get product catalog
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 */
router.get('/products', getProductCatalog);

/**
 * @swagger
 * /api/config/states:
 *   get:
 *     summary: Get Indian states
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 */
router.get('/states', getIndianStates);

export default router;

