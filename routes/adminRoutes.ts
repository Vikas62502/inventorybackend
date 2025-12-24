import express, { Router } from 'express';
import {
  getAllQuotations,
  updateQuotationStatus,
  getAllDealers,
  getSystemStatistics
} from '../controllers/adminController';
import {
  createVisitor,
  getAllVisitors,
  getVisitorById,
  updateVisitor,
  updateVisitorPassword,
  deleteVisitor
} from '../controllers/adminVisitorController';
import { authenticate, authorizeAdmin } from '../middleware/authQuotation';
import { validate } from '../middleware/validate';
import { updateStatusSchema, createVisitorSchema, updateVisitorSchema, updateVisitorPasswordSchema } from '../validations/adminValidations';

const router: Router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorizeAdmin);

/**
 * @swagger
 * /api/admin/quotations:
 *   get:
 *     summary: Get all quotations (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/quotations', getAllQuotations);

/**
 * @swagger
 * /api/admin/quotations/{quotationId}/status:
 *   patch:
 *     summary: Update quotation status (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/quotations/:quotationId/status', validate(updateStatusSchema), updateQuotationStatus);

/**
 * @swagger
 * /api/admin/dealers:
 *   get:
 *     summary: Get all dealers (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dealers', getAllDealers);

/**
 * @swagger
 * /api/admin/statistics:
 *   get:
 *     summary: Get system statistics (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', getSystemStatistics);

/**
 * @swagger
 * /api/admin/visitors:
 *   post:
 *     summary: Create visitor (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.post('/visitors', validate(createVisitorSchema), createVisitor);

/**
 * @swagger
 * /api/admin/visitors:
 *   get:
 *     summary: Get all visitors (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/visitors', getAllVisitors);

/**
 * @swagger
 * /api/admin/visitors/{visitorId}:
 *   get:
 *     summary: Get visitor by ID (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/visitors/:visitorId', getVisitorById);

/**
 * @swagger
 * /api/admin/visitors/{visitorId}:
 *   put:
 *     summary: Update visitor (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.put('/visitors/:visitorId', validate(updateVisitorSchema), updateVisitor);

/**
 * @swagger
 * /api/admin/visitors/{visitorId}/password:
 *   put:
 *     summary: Update visitor password (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.put('/visitors/:visitorId/password', validate(updateVisitorPasswordSchema), updateVisitorPassword);

/**
 * @swagger
 * /api/admin/visitors/{visitorId}:
 *   delete:
 *     summary: Deactivate visitor (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/visitors/:visitorId', deleteVisitor);

export default router;

