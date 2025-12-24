import express, { Router } from 'express';
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotationDiscount,
  downloadQuotationPDF
} from '../controllers/quotationController';
import { getVisitsForQuotation } from '../controllers/visitController';
import { authenticate, authorizeDealer } from '../middleware/authQuotation';
import { validate } from '../middleware/validate';
import { createQuotationSchema, updateDiscountSchema } from '../validations/quotationValidations';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(authorizeDealer);

/**
 * @swagger
 * /api/quotations:
 *   post:
 *     summary: Create quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', validate(createQuotationSchema), createQuotation);

/**
 * @swagger
 * /api/quotations:
 *   get:
 *     summary: Get quotations with pagination
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', getQuotations);

/**
 * @swagger
 * /api/quotations/{quotationId}:
 *   get:
 *     summary: Get quotation by ID
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:quotationId', getQuotationById);

/**
 * @swagger
 * /api/quotations/{quotationId}/discount:
 *   patch:
 *     summary: Update quotation discount
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:quotationId/discount', validate(updateDiscountSchema), updateQuotationDiscount);

/**
 * @swagger
 * /api/quotations/{quotationId}/pdf:
 *   get:
 *     summary: Download quotation PDF
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:quotationId/pdf', downloadQuotationPDF);

/**
 * @swagger
 * /api/quotations/{quotationId}/visits:
 *   get:
 *     summary: Get visits for quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:quotationId/visits', getVisitsForQuotation);

export default router;

