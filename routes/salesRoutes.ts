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

// Get routes
router.get('/', getAllSales);
router.get('/summary', getSalesSummary);
router.get('/:id', getSaleById);

// Create - agents and admins can create sales
router.post('/', authorize('agent', 'admin'), upload.single('image'), validateWithJsonParse(createSaleSchema, ['items']), createSale);

// Update - creator, admin, or super-admin can update
router.put('/:id', upload.single('image'), validate(updateSaleSchema), updateSale);

// Confirm B2B bill - only account role
router.post('/:id/confirm-bill', authorize('account'), upload.single('bill_image'), confirmB2BBill);

// Delete - creator or super-admin can delete
router.delete('/:id', deleteSale);

export default router;

