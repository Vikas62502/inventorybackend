import express, { Router } from 'express';
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotationDiscount,
  downloadQuotationPDF,
  getProductCatalog
} from '../controllers/quotationController';
import { getVisitsForQuotation } from '../controllers/visitController';
import { authenticate, authorizeDealer, authorizeDealerAdminOrVisitor } from '../middleware/authQuotation';
import { validate } from '../middleware/validate';
import { logRequestBeforeValidation, logRequestAfterValidation } from '../middleware/requestLogger';
import { createQuotationSchema, updateDiscountSchema } from '../validations/quotationValidations';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

// Read operations (GET) allow dealers, admins, and visitors
// Write operations (POST, PATCH) require dealer/admin only

/**
 * @swagger
 * /api/quotations:
 *   post:
 *     summary: Create a new quotation
 *     description: Create a new quotation with customer and product details
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - products
 *             properties:
 *               customerId:
 *                 type: string
 *                 description: Existing customer ID (optional if customer object provided)
 *               customer:
 *                 type: object
 *                 description: New customer object (optional if customerId provided)
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   mobile:
 *                     type: string
 *                   email:
 *                     type: string
 *                   address:
 *                     type: object
 *               products:
 *                 type: object
 *                 required:
 *                   - systemType
 *                 properties:
 *                   systemType:
 *                     type: string
 *                     enum: [on-grid, off-grid, hybrid, dcr, non-dcr, both, customize]
 *                   panelBrand:
 *                     type: string
 *                   panelSize:
 *                     type: string
 *                   panelQuantity:
 *                     type: integer
 *               discount:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 0
 *     responses:
 *       201:
 *         description: Quotation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quotation'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.post('/', 
  authorizeDealer, 
  logRequestBeforeValidation,      // Log BEFORE validation
  validate(createQuotationSchema),  // Validation middleware
  logRequestAfterValidation,        // Log AFTER validation
  createQuotation
);

/**
 * @swagger
 * /api/quotations/product-catalog:
 *   get:
 *     summary: Get product catalog for product selection
 *     description: Returns the product catalog with all available brands, sizes, types, and options for use in product selection forms. Accessible to dealers, admins, and visitors.
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product catalog retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductCatalogResponse'
 *             example:
 *               success: true
 *               data:
 *                 panels:
 *                   brands: ["Adani", "Tata", "Waaree", "Vikram Solar", "RenewSys"]
 *                   sizes: ["440W", "445W", "540W", "545W", "550W", "555W"]
 *                 inverters:
 *                   types: ["String Inverter", "Micro Inverter", "Hybrid Inverter"]
 *                   brands: ["Growatt", "Solis", "Fronius", "Havells", "Polycab", "Delta"]
 *                   sizes: ["3kW", "5kW", "6kW", "8kW", "10kW", "15kW", "20kW", "25kW"]
 *                 structures:
 *                   types: ["GI Structure", "Aluminum Structure", "MS Structure"]
 *                   sizes: ["1kW", "2kW", "3kW", "5kW", "10kW", "15kW", "20kW"]
 *                 meters:
 *                   brands: ["L&T", "HPL", "Havells", "Genus", "Secure"]
 *                 cables:
 *                   brands: ["Polycab", "Havells", "KEI", "Finolex", "RR Kabel"]
 *                   sizes: ["4 sq mm", "6 sq mm", "10 sq mm", "16 sq mm", "25 sq mm"]
 *                 acdb:
 *                   options: ["1-String", "2-String", "3-String", "4-String"]
 *                 dcdb:
 *                   options: ["1-String", "2-String", "3-String", "4-String", "5-String"]
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "AUTH_003"
 *                 message: "User not authenticated"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "SYS_001"
 *                 message: "Internal server error"
 */
router.get('/product-catalog', authorizeDealerAdminOrVisitor, getProductCatalog);

/**
 * @swagger
 * /api/quotations:
 *   get:
 *     summary: Get all quotations with pagination
 *     description: Retrieve a list of quotations with optional filtering and pagination
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, completed]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of quotations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Quotation'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', authorizeDealerAdminOrVisitor, getQuotations);

/**
 * @swagger
 * /api/quotations/{quotationId}:
 *   get:
 *     summary: Get quotation by ID
 *     description: Retrieve detailed information about a specific quotation. Dealers can see their own quotations, admins can see all, visitors can see quotations from their assigned visits.
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Quotation ID
 *     responses:
 *       200:
 *         description: Quotation details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quotation'
 *       403:
 *         description: Forbidden - Visitor trying to access quotation not assigned to them
 *       404:
 *         description: Quotation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.get('/:quotationId', authorizeDealerAdminOrVisitor, getQuotationById);

/**
 * @swagger
 * /api/quotations/{quotationId}/discount:
 *   patch:
 *     summary: Update quotation discount
 *     description: Update the discount percentage for a quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Quotation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - discount
 *             properties:
 *               discount:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Discount percentage
 *     responses:
 *       200:
 *         description: Discount updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quotation'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Quotation not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:quotationId/discount', authorizeDealer, validate(updateDiscountSchema), updateQuotationDiscount);

/**
 * @swagger
 * /api/quotations/{quotationId}/pdf:
 *   get:
 *     summary: Download quotation as PDF
 *     description: Generate and download a PDF version of the quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Quotation ID
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Quotation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.get('/:quotationId/pdf', authorizeDealerAdminOrVisitor, downloadQuotationPDF);

/**
 * @swagger
 * /api/quotations/{quotationId}/visits:
 *   get:
 *     summary: Get visits for a quotation
 *     description: Retrieve all visits associated with a specific quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Quotation ID
 *     responses:
 *       200:
 *         description: List of visits
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Visit'
 *       404:
 *         description: Quotation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.get('/:quotationId/visits', authorizeDealerAdminOrVisitor, getVisitsForQuotation);

export default router;


