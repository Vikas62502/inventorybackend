import express, { Router } from 'express';
import {
  getAllSales,
  getSaleById,
  createSale,
  updateSale,
  confirmB2BBill,
  deleteSale,
  getSalesSummary
} from '../controllers/salesController';
import { authenticate, authorize } from '../middleware/auth';
import upload from '../middleware/upload';
import { validateWithJsonParse } from '../middleware/validateWithJsonParse';
import { validate } from '../middleware/validate';
import { createSaleSchema, updateSaleSchema } from '../validations/salesValidations';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Get all sales
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sales
 */
router.get('/', getAllSales);

/**
 * @swagger
 * /api/sales/summary:
 *   get:
 *     summary: Get sales summary
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales summary
 */
router.get('/summary', getSalesSummary);

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     summary: Get sale by ID
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sale details
 *       404:
 *         description: Sale not found
 */
router.get('/:id', getSaleById);

/**
 * @swagger
 * /api/sales:
 *   post:
 *     summary: Create a new sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - customer_name
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [B2B, B2C]
 *               customer_name:
 *                 type: string
 *               items:
 *                 type: string
 *                 description: JSON string array of items
 *               subtotal:
 *                 type: number
 *               tax_amount:
 *                 type: number
 *               discount_amount:
 *                 type: number
 *               payment_status:
 *                 type: string
 *                 enum: [pending, completed]
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Sale created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', authorize('agent', 'admin'), upload.single('image'), validateWithJsonParse(createSaleSchema, ['items']), createSale);

// Update - creator, admin, or super-admin can update
router.put('/:id', upload.single('image'), validate(updateSaleSchema), updateSale);

// Confirm B2B bill - only account role
router.post('/:id/confirm-bill', authorize('account'), upload.single('bill_image'), confirmB2BBill);

// Delete - creator or super-admin can delete
router.delete('/:id', deleteSale);

export default router;

