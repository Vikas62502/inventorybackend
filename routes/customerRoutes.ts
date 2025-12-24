import express, { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer
} from '../controllers/customerController';
import { authenticate, authorizeDealer } from '../middleware/authQuotation';
import { validate } from '../middleware/validate';
import { createCustomerSchema, updateCustomerSchema } from '../validations/customerValidations';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(authorizeDealer);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', validate(createCustomerSchema), createCustomer);

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get customers with pagination
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', getCustomers);

/**
 * @swagger
 * /api/customers/{customerId}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:customerId', getCustomerById);

/**
 * @swagger
 * /api/customers/{customerId}:
 *   put:
 *     summary: Update customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:customerId', validate(updateCustomerSchema), updateCustomer);

export default router;

