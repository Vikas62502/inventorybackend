import express, { Router } from 'express';
import {
  createVisit,
  approveVisit,
  completeVisit,
  markVisitIncomplete,
  rescheduleVisit,
  rejectVisit,
  deleteVisit
} from '../controllers/visitController';
import { authenticate, authorizeDealer, authorizeVisitor } from '../middleware/authQuotation';
import { validate } from '../middleware/validate';
import { createVisitSchema, completeVisitSchema, incompleteVisitSchema, rescheduleVisitSchema, rejectVisitSchema } from '../validations/visitValidations';

const router: Router = express.Router();

/**
 * @swagger
 * /api/visits:
 *   post:
 *     summary: Create visit (dealer)
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, authorizeDealer, validate(createVisitSchema), createVisit);

/**
 * @swagger
 * /api/quotations/{quotationId}/visits:
 *   get:
 *     summary: Get visits for quotation (dealer)
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 */
// Note: This route should be added to quotationRoutes.ts instead
// router.get('/quotations/:quotationId/visits', authenticate, authorizeDealer, getVisitsForQuotation);

/**
 * @swagger
 * /api/visits/{visitId}/approve:
 *   patch:
 *     summary: Approve visit (visitor)
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:visitId/approve', authenticate, authorizeVisitor, approveVisit);

/**
 * @swagger
 * /api/visits/{visitId}/complete:
 *   patch:
 *     summary: Complete visit (visitor)
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:visitId/complete', authenticate, authorizeVisitor, validate(completeVisitSchema), completeVisit);

/**
 * @swagger
 * /api/visits/{visitId}/incomplete:
 *   patch:
 *     summary: Mark visit as incomplete (visitor)
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:visitId/incomplete', authenticate, authorizeVisitor, validate(incompleteVisitSchema), markVisitIncomplete);

/**
 * @swagger
 * /api/visits/{visitId}/reschedule:
 *   patch:
 *     summary: Reschedule visit (visitor)
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:visitId/reschedule', authenticate, authorizeVisitor, validate(rescheduleVisitSchema), rescheduleVisit);

/**
 * @swagger
 * /api/visits/{visitId}/reject:
 *   patch:
 *     summary: Reject visit (visitor)
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:visitId/reject', authenticate, authorizeVisitor, validate(rejectVisitSchema), rejectVisit);

/**
 * @swagger
 * /api/visits/{visitId}:
 *   delete:
 *     summary: Delete visit (dealer)
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:visitId', authenticate, authorizeDealer, deleteVisit);

export default router;

