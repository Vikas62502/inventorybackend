import express, { Router } from 'express';
import { getAssignedVisits, getVisitorStatistics } from '../controllers/visitorController';
import { authenticate, authorizeVisitor } from '../middleware/authQuotation';

const router: Router = express.Router();

// All routes require visitor authentication
router.use(authenticate);
router.use(authorizeVisitor);

/**
 * @swagger
 * /api/visitors/me/visits:
 *   get:
 *     summary: Get assigned visits (visitor)
 *     tags: [Visitors]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me/visits', getAssignedVisits);

/**
 * @swagger
 * /api/visitors/me/statistics:
 *   get:
 *     summary: Get visitor statistics
 *     tags: [Visitors]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me/statistics', getVisitorStatistics);

export default router;

