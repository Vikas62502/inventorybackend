// Must load before any module that reads process.env at import time (e.g. SMS).
import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import logger from './config/logger';
import { sequelizeBootstrap } from './config/sequelizeBootstrap';
import { attachRealtimeServer, emitRealtime, realtimeEvents } from './utils/realtime';
import { startSheetAutoSyncCron } from './utils/sheetAutoSyncCron';
import { startSheetWriteBackCron } from './utils/sheetWriteBackCron';
import { sendSms } from './utils/otp/sms';
import { sendApprovalOtp, verifyApprovalOtp } from './utils/otp/approvalOtp';
import { sendQuotationApprovalEmail, warmApprovalMailer } from './utils/emails/approvalemail';
import { warmProposalPdfBrowser } from './utils/emails/generateProposalPdf';

// Import route (Inventory Systems)
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import adminInventoryRoutes from './routes/adminInventoryRoutes';
import stockRequestRoutes from './routes/stockRequestRoutes';
import salesRoutes from './routes/salesRoutes';
import inventoryTransactionRoutes from './routes/inventoryTransactionRoutes';
import stockReturnRoutes from './routes/stockReturnRoutes';
import serialNumberRoutes from './routes/serialNumberRoutes';
import reviewRoutes from './routes/reviewRoutes';
import mapsRoutes from './routes/mapsRoutes';

// Import routes (Quotation System)
import quotationAuthRoutes from './routes/quotationAuthRoutes';
import dealerRoutes from './routes/dealerRoutes';
import customerRoutes from './routes/customerRoutes';
import quotationRoutes from './routes/quotationRoutes';
import visitRoutes from './routes/visitRoutes';
import visitorRoutes from './routes/visitorRoutes';
import adminRoutes from './routes/adminRoutes';
import configRoutes from './routes/configRoutes';
import accountManagerRoutes from './routes/accountManagerRoutes';
import accountManagementRoutes from './routes/accountManagementRoutes';
import dealerRequestRoutes from './routes/dealerRequestRoutes';
import installerRoutes from './routes/installerRoutes';
import baldevRoutes from './routes/baldevRoutes';
import hrLeadRoutes from './routes/hrLeadRoutes';
import meteringRoutes from './routes/meteringRoutes';

const app: Application = express();
const PORT = process.env.PORT || 3000;
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const getApiDomain = (requestPath: string): string => {
  const cleanPath = requestPath.split('?')[0];
  if (!cleanPath.startsWith('/api/')) return 'system';
  const segments = cleanPath.replace(/^\/api\//, '').split('/').filter(Boolean);
  return segments[0] || 'system';
};

const getActor = (req: Request): { id?: string; role?: string; username?: string } => {
  const actor = (req as any).user || (req as any).dealer || (req as any).visitor;
  if (!actor) return {};
  return {
    id: actor.id,
    role: actor.role,
    username: actor.username
  };
};

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3050', 'http://localhost:3001', 'http://43.204.133.228:3051', 'http://43.204.133.228:3050', 'http://localhost:3002', 'http://localhost:3003','http://quotation.chairbordsolar.com', 'http://api.inventory.chairbordsolar.com', 'https://api.inventory.chairbordsolar.com', 'https://inventory.chairbordsolar.com', 'http://43.204.133.228:3052','https://quotation.chairbordsolar.com','http://192.168.1.25:3000','http://192.0.0.2:3000', 'http://192.168.1.47:3000', 'https://chairbord-solar-reviews.vercel.app','http://187.127.158.150:3051','https://crm.chairbordsolar.com'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl request)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
// Increase body parser limits to handle larger payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Chairbord Solar Inventory API Documentation'
}));

// Swagger JSON endpoint (for API collection tools like Postman, Insomnia)
app.get('/api-docs.json', (_: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check route
app.get('/health', (_: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Global request instrumentation + backend-wide websocket mutation stream
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestPath = req.originalUrl || req.url;
  const domain = getApiDomain(requestPath);

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.HTTP_REQUEST_LOGGING !== 'false') {
      logger.info('HTTP Request', {
        method: req.method,
        url: requestPath,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    if (!MUTATION_METHODS.has(req.method)) return;
    if (res.statusCode < 200 || res.statusCode >= 400) return;
    if (!requestPath.startsWith('/api/')) return;

    const payload = {
      method: req.method,
      path: requestPath,
      domain,
      statusCode: res.statusCode,
      timestamp: new Date().toISOString(),
      actor: getActor(req)
    };

    emitRealtime(realtimeEvents.backendMutation, payload, 'stream:backend');
    emitRealtime(realtimeEvents.backendMutation, payload, `stream:${domain}`);
  });

  next();
});

// API Routes (Inventory System) - Separate login endpoint
app.use('/api/inventory-auth', authRoutes); // /api/inventory-auth/login for Inventory System (legacy, also works via /api/auth/login)

// API Routes (Quotation System) - Universal login endpoint
app.use('/api/auth', quotationAuthRoutes); // /api/auth/login works for BOTH systems (checks dealers/visitors first, then users)
app.use('/api/dealers', dealerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/account-managers', accountManagerRoutes);
app.use('/api/account-management', accountManagementRoutes);
app.use('/api/config', configRoutes);
app.use('/api/dealer-requests', dealerRequestRoutes);
app.use('/api/installer', installerRoutes);
app.use('/api/baldev', baldevRoutes);
app.use('/api/hr', hrLeadRoutes);
app.use('/api/metering', meteringRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin-inventory', adminInventoryRoutes);
app.use('/api/stock-requests', stockRequestRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory-transactions', inventoryTransactionRoutes);
app.use('/api/stock-returns', stockReturnRoutes);
app.use('/api/serial-numbers', serialNumberRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/maps', mapsRoutes);

/**
 * @swagger
 * /api/send-sms:
 *   post:
 *     summary: Send ChairBord OTP SMS
 *     description: Sends a DLT-registered OTP SMS via the ChairBord 2FA_AUTH template.
 *     tags: [SMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobileNumber
 *               - message
 *               - otpNumber
 *             properties:
 *               mobileNumber:
 *                 type: string
 *                 description: Recipient mobile number (10 digits)
 *                 example: "9876543210"
 *               message:
 *                 type: string
 *                 description: Context label inserted into the SMS template (e.g. login / wallet top-up)
 *                 example: "Wallet TOP UP 2FA"
 *               otpNumber:
 *                 type: string
 *                 description: OTP value to send
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: SMS accepted for delivery
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: SMS sent successfully
 *       400:
 *         description: Missing or invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: SMS provider / configuration error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/send-sms', (req: Request, res: Response) => {
  const { mobileNumber, message, otpNumber } = req.body;
  void sendSms(mobileNumber, message, otpNumber, '2FA_AUTH');
  res.json({ success: true, message: 'SMS sent successfully' });
});

/**
 * @swagger
 * /api/send-approval-email:
 *   post:
 *     summary: Send quotation approval email with proposal PDF
 *     description: |
 *       Loads the quotation by `quotationId`, builds the Solar Installation Proposal PDF from that
 *       quotation (same 3-page layout as the frontend download), and emails it from connect@chairbord.com.
 *       Email body details (customer, system, pricing) also come from that quotation id.
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quotationId
 *             properties:
 *               quotationId:
 *                 type: string
 *                 description: Quotation id used to build the PDF and email content
 *                 example: "QT-5MXYEQ"
 *               to:
 *                 type: string
 *                 format: email
 *                 description: Optional override; defaults to customer.email on the quotation
 *                 example: "customer@example.com"
 *               kind:
 *                 type: string
 *                 enum: [consent, approved]
 *                 description: consent = file-login proposal/consent email; approved = after admin approve
 *                 example: consent
 *               cc:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 description: Optional CC address(es)
 *     responses:
 *       200:
 *         description: Approval email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Approval email sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     messageId:
 *                       type: string
 *                       example: "<abc@mail.gmail.com>"
 *                     to:
 *                       type: string
 *                       example: "customer@example.com"
 *                     quotationId:
 *                       type: string
 *                       example: "QT-5MXYEQ"
 *       400:
 *         description: Missing quotationId / invalid email / quotation has no customer email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Quotation not found (when resolving customer email)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Mail / PDF generation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/send-approval-email', async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const quotationId = String(body.quotationId ?? body.quotation_id ?? '').trim();
    if (!quotationId) {
      res.status(400).json({
        success: false,
        error: { code: 'VAL_001', message: 'quotationId is required' }
      });
      return;
    }

    const toOverride = String(body.to ?? body.email ?? '').trim();
    const kindRaw = String(body.kind ?? body.purpose ?? '').trim().toLowerCase();
    const kind = kindRaw === 'consent' ? 'consent' : 'approved';
    // Default: respond immediately and send in background (PDF+Gmail was blocking the UI for 20-60s).
    // Pass wait=true if the client needs the actual Gmail messageId.
    const waitForSend =
      body.wait === true ||
      body.wait === 'true' ||
      body.sync === true ||
      body.sync === 'true';

    if (!waitForSend) {
      res.json({
        success: true,
        message: 'Approval email queued',
        data: { quotationId, queued: true, kind }
      });
      void sendQuotationApprovalEmail({
        quotationId,
        to: toOverride || undefined,
        cc: body.cc as string | string[] | undefined,
        kind
      }).catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to send approval email';
        logger.error('Send approval email failed (background)', { error: message, quotationId });
      });
      return;
    }

    const result = await sendQuotationApprovalEmail({
      quotationId,
      to: toOverride || undefined,
      cc: body.cc as string | string[] | undefined,
      kind
    });

    res.json({
      success: true,
      message: 'Approval email sent successfully',
      data: {
        messageId: result.messageId,
        to: result.to,
        quotationId: result.quotationId
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send approval email';
    const notFound = /not found/i.test(message);
    const badRequest =
      /required|recipient email|customer\.email/i.test(message) || /quotationId/i.test(message);
    logger.error('Send approval email failed', { error: message });
    res.status(notFound ? 404 : badRequest ? 400 : 500).json({
      success: false,
      error: {
        code: notFound ? 'RES_001' : badRequest ? 'VAL_001' : 'SYS_001',
        message
      }
    });
  }
});

/**
 * @swagger
 * /api/approval-otp/send:
 *   post:
 *     summary: Send 4-digit approval OTP SMS
 *     description: |
 *       Generates a random 4-digit OTP, stores it for the quotation (30 minutes),
 *       replaces any previous OTP for that quotation, and SMS to Kamlesh / Sunil / HR.
 *       Default recipient is Kamlesh Sir (8210554718).
 *     tags: [SMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quotationId]
 *             properties:
 *               quotationId:
 *                 type: string
 *                 example: QT-5MXYEQ
 *               recipient:
 *                 type: string
 *                 enum: [kamlesh, sunil, hr]
 *                 default: kamlesh
 *     responses:
 *       200:
 *         description: OTP stored and SMS accepted
 *       400:
 *         description: Validation error
 *       404:
 *         description: Quotation not found
 */
app.post('/api/approval-otp/send', async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const quotationId = String(body.quotationId ?? body.quotation_id ?? '').trim();
    if (!quotationId) {
      res.status(400).json({
        success: false,
        error: { code: 'VAL_001', message: 'quotationId is required' }
      });
      return;
    }
    const result = await sendApprovalOtp({
      quotationId,
      recipient: String(body.recipient ?? body.to ?? 'kamlesh')
    });
    res.json({
      success: true,
      message: `OTP sent to ${result.recipientLabel}`,
      data: {
        quotationId: result.quotationId,
        recipient: result.recipientKey,
        recipientLabel: result.recipientLabel,
        mobileNumber: result.mobileNumber,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send approval OTP';
    const notFound = /not found/i.test(message);
    logger.error('Send approval OTP failed', { error: message });
    res.status(notFound ? 404 : 400).json({
      success: false,
      error: { code: notFound ? 'RES_001' : 'VAL_001', message }
    });
  }
});

/**
 * @swagger
 * /api/approval-otp/verify:
 *   post:
 *     summary: Verify approval OTP
 *     description: |
 *       Checks the 4-digit OTP against the database for the quotation.
 *       On success the OTP row is erased. Expired OTPs (30 min) are erased.
 *     tags: [SMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quotationId, otp]
 *             properties:
 *               quotationId:
 *                 type: string
 *               otp:
 *                 type: string
 *                 example: "4821"
 *     responses:
 *       200:
 *         description: OTP verified and cleared
 *       400:
 *         description: Incorrect / expired / missing OTP
 */
app.post('/api/approval-otp/verify', async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const quotationId = String(body.quotationId ?? body.quotation_id ?? '').trim();
    const otp = String(body.otp ?? body.otpNumber ?? '').trim();
    if (!quotationId) {
      res.status(400).json({
        success: false,
        error: { code: 'VAL_001', message: 'quotationId is required' }
      });
      return;
    }
    const result = await verifyApprovalOtp({ quotationId, otp });
    res.json({
      success: true,
      message: 'OTP verified',
      data: {
        quotationId: result.quotationId,
        verified: true,
        recipient: result.recipientKey,
        recipientKey: result.recipientKey,
        recipientLabel: result.recipientLabel,
        mobileNumber: result.mobileNumber
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify OTP';
    logger.error('Verify approval OTP failed', { error: message });
    res.status(400).json({
      success: false,
      error: { code: 'VAL_OTP', message }
    });
  }
});

// 404 handler res
app.use((_: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  const storageCode = (err as { code?: string }).code;
  if (storageCode === 'SYS_STORAGE') {
    const status = (err as { status?: number }).status || 503;
    const hint = (err as { storageHint?: string }).storageHint;
    logger.error('File storage error', {
      message: err.message,
      status,
      hint
    });
    res.status(status).json({
      success: false,
      error: {
        code: 'SYS_STORAGE',
        message: err.message || 'File storage is not configured or unavailable.',
        ...(hint ? { hint } : {})
      }
    });
    return;
  }

  const status = (err as any).status || 500;
  const errorMessage = err.message || 'Internal server error';

  // Handle payload too large error specifically
  if (status === 413 || errorMessage.includes('request entity too large') || errorMessage.includes('PayloadTooLargeError')) {
    logger.error('Request payload too large', {
      error: errorMessage,
      status: 413
    });
    
    res.status(413).json({
      success: false,
      error: {
        code: 'VAL_003',
        message: 'Request payload too large. Maximum size is 50MB.'
      }
    });
    return;
  }

  logger.error('Unhandled error', {
    error: errorMessage,
    stack: err.stack,
    status
  });

  res.status(status).json({
    success: false,
    error: {
      code: status === 500 ? 'SYS_001' : 'ERR_001',
      message: errorMessage
    }
  });
});

// Start HTTP + WebSocket server after DB is ready (avoids 500s when schema lags the Sequelize )
const httpServer = attachRealtimeServer(app, allowedOrigins);
void sequelizeBootstrap.then(() => {
  const listenPort = Number(PORT) || 3000;
  httpServer.listen(listenPort, '0.0.0.0', () => {
    logger.info('Server started', {
      port: listenPort,
      environment: process.env.NODE_ENV || 'development',
      apiBaseUrl: `http://localhost:${listenPort}/api`,
      swaggerUrl: `http://localhost:${listenPort}/api-docs`,
      websocketPath: `http://localhost:${listenPort}/socket.io`
    });
    // HR Social Media: sheet → DB every 10 min; DB → sheet + stale reassign every 2 hours
    startSheetAutoSyncCron();
    startSheetWriteBackCron();
    // Pay Chrome launch and the Gmail TLS handshake now, not on the first approval email.
    void warmProposalPdfBrowser();
    void warmApprovalMailer();
  });
});



export default app;


