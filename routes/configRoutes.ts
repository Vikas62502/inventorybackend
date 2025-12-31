import express, { Router } from 'express';
import { getProductCatalog, getIndianStates, updateProductCatalog, getPricingTables, updatePricingTables } from '../controllers/configController';
import { authenticate, authorizeAdmin } from '../middleware/authQuotation';
import { validate } from '../middleware/validate';
import { updateProductCatalogSchema } from '../validations/configValidations';
import { updatePricingTablesSchema } from '../validations/pricingValidations';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/config/products:
 *   get:
 *     summary: Get product catalog
 *     description: Retrieves the complete product catalog with all available brands, sizes, types, and options. Returns empty arrays if no catalog exists.
 *     tags: [Config]
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
router.get('/products', getProductCatalog);

/**
 * @swagger
 * /api/config/products:
 *   put:
 *     summary: Update product catalog
 *     description: Updates the product catalog configuration. Requires admin role.
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCatalog'
 *           example:
 *             panels:
 *               brands: ["Adani", "Tata", "Waaree", "Vikram Solar", "RenewSys"]
 *               sizes: ["440W", "445W", "540W", "545W", "550W", "555W"]
 *             inverters:
 *               types: ["String Inverter", "Micro Inverter", "Hybrid Inverter"]
 *               brands: ["Growatt", "Solis", "Fronius", "Havells", "Polycab", "Delta"]
 *               sizes: ["3kW", "5kW", "6kW", "8kW", "10kW", "15kW", "20kW", "25kW"]
 *             structures:
 *               types: ["GI Structure", "Aluminum Structure", "MS Structure"]
 *               sizes: ["1kW", "2kW", "3kW", "5kW", "10kW", "15kW", "20kW"]
 *             meters:
 *               brands: ["L&T", "HPL", "Havells", "Genus", "Secure"]
 *             cables:
 *               brands: ["Polycab", "Havells", "KEI", "Finolex", "RR Kabel"]
 *               sizes: ["4 sq mm", "6 sq mm", "10 sq mm", "16 sq mm", "25 sq mm"]
 *             acdb:
 *               options: ["1-String", "2-String", "3-String", "4-String"]
 *             dcdb:
 *               options: ["1-String", "2-String", "3-String", "4-String", "5-String"]
 *     responses:
 *       200:
 *         description: Product catalog updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductCatalogUpdateResponse'
 *             example:
 *               success: true
 *               message: "Product catalog updated successfully"
 *               data:
 *                 panels:
 *                   brands: ["Adani", "Tata", "Waaree"]
 *                   sizes: ["440W", "445W", "540W"]
 *                 inverters:
 *                   types: ["String Inverter", "Micro Inverter"]
 *                   brands: ["Growatt", "Solis", "Fronius"]
 *                   sizes: ["3kW", "5kW", "6kW", "8kW"]
 *                 structures:
 *                   types: ["GI Structure", "Aluminum Structure"]
 *                   sizes: ["1kW", "2kW", "3kW", "5kW"]
 *                 meters:
 *                   brands: ["L&T", "HPL", "Havells"]
 *                 cables:
 *                   brands: ["Polycab", "Havells", "KEI"]
 *                   sizes: ["4 sq mm", "6 sq mm", "10 sq mm"]
 *                 acdb:
 *                   options: ["1-String", "2-String", "3-String"]
 *                 dcdb:
 *                   options: ["1-String", "2-String", "3-String", "4-String"]
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "VAL_001"
 *                 message: "Validation error"
 *                 details:
 *                   - field: "panels.brands"
 *                     message: "At least one panel brand is required"
 *                   - field: "inverters.types"
 *                     message: "At least one inverter type is required"
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
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "AUTH_004"
 *                 message: "Insufficient permissions. Admin access required."
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
router.put('/products', authorizeAdmin, validate(updateProductCatalogSchema), updateProductCatalog);

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

/**
 * @swagger
 * /api/config/pricing:
 *   get:
 *     summary: Get pricing tables
 *     description: Retrieves all pricing tables including component pricing, system pricing, and system configuration presets. Returns empty arrays if no pricing data exists.
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pricing tables retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     panels:
 *                       type: array
 *                       items:
 *                         type: object
 *                     inverters:
 *                       type: array
 *                     structures:
 *                       type: array
 *                     meters:
 *                       type: array
 *                     cables:
 *                       type: array
 *                     acdb:
 *                       type: array
 *                     dcdb:
 *                       type: array
 *                     dcr:
 *                       type: array
 *                     nonDcr:
 *                       type: array
 *                     both:
 *                       type: array
 *                     systemConfigs:
 *                       type: array
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/pricing', getPricingTables);

/**
 * @swagger
 * /api/config/pricing:
 *   put:
 *     summary: Update pricing tables
 *     description: Updates pricing tables for components, systems, and configuration presets. Requires admin role.
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               panels:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     brand:
 *                       type: string
 *                     size:
 *                       type: string
 *                     price:
 *                       type: number
 *               inverters:
 *                 type: array
 *               structures:
 *                 type: array
 *               meters:
 *                 type: array
 *               cables:
 *                 type: array
 *               acdb:
 *                 type: array
 *               dcdb:
 *                 type: array
 *               dcr:
 *                 type: array
 *               nonDcr:
 *                 type: array
 *               both:
 *                 type: array
 *               systemConfigs:
 *                 type: array
 *     responses:
 *       200:
 *         description: Pricing tables updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.put('/pricing', authorizeAdmin, validate(updatePricingTablesSchema), updatePricingTables);

export default router;


