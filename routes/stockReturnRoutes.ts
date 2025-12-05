import express, { Router } from 'express';
import {
  getAllStockReturns,
  getStockReturnById,
  createStockReturn,
  processStockReturn,
  updateStockReturn,
  deleteStockReturn
} from '../controllers/stockReturnController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createStockReturnSchema, updateStockReturnSchema } from '../validations/stockReturnValidations';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/stock-returns:
 *   get:
 *     summary: Get stock returns (filtered by role)
 *     tags: [Stock Returns]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Results are filtered on the server based on the authenticated user's role:
 *       - Admins see only their own returns (admin_id = current admin).
 *       - Super-admin and Account roles can see all returns.
 *       - Agents are not allowed to list stock returns.
 *     responses:
 *       200:
 *         description: List of stock returns
 */
router.get('/', getAllStockReturns);

/**
 * @swagger
 * /api/stock-returns/{id}:
 *   get:
 *     summary: Get stock return by ID
 *     tags: [Stock Returns]
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
 *         description: Stock return details
 *       404:
 *         description: Stock return not found
 */
router.get('/:id', getStockReturnById);

// Create - admins can create returns
router.post('/', authorize('admin'), validate(createStockReturnSchema), createStockReturn);

// Process - super-admin processes returns
router.post('/:id/process', authorize('super-admin'), processStockReturn);

// Update - admin or super-admin can update pending returns
router.put('/:id', validate(updateStockReturnSchema), updateStockReturn);

// Delete - admin or super-admin can delete pending returns
router.delete('/:id', deleteStockReturn);

export default router;

