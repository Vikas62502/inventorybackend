import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import logger from './config/logger';

dotenv.config();

// Import routes (Inventory System)
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import adminInventoryRoutes from './routes/adminInventoryRoutes';
import stockRequestRoutes from './routes/stockRequestRoutes';
import salesRoutes from './routes/salesRoutes';
import inventoryTransactionRoutes from './routes/inventoryTransactionRoutes';
import stockReturnRoutes from './routes/stockReturnRoutes';

// Import routes (Quotation System)
import quotationAuthRoutes from './routes/quotationAuthRoutes';
import dealerRoutes from './routes/dealerRoutes';
import customerRoutes from './routes/customerRoutes';
import quotationRoutes from './routes/quotationRoutes';
import visitRoutes from './routes/visitRoutes';
import visitorRoutes from './routes/visitorRoutes';
import adminRoutes from './routes/adminRoutes';
import configRoutes from './routes/configRoutes';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3050', 'http://localhost:3001', 'http://43.204.133.228:3051', 'http://43.204.133.228:3050', 'http://localhost:3002'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Chairbord Solar Inventory API Documentation'
}));

// Health check route
app.get('/health', (_: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes (Inventory System)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin-inventory', adminInventoryRoutes);
app.use('/api/stock-requests', stockRequestRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory-transactions', inventoryTransactionRoutes);
app.use('/api/stock-returns', stockReturnRoutes);

// API Routes (Quotation System)
app.use('/api/auth', quotationAuthRoutes); // Overlaps with inventory auth - can be merged
app.use('/api/dealers', dealerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);

// 404 handler
app.use((_: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });

  next();
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    status: (err as any).status || 500
  });

  res.status((err as any).status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    apiBaseUrl: `http://localhost:${PORT}/api`,
    swaggerUrl: `http://localhost:${PORT}/api-docs`
  });

  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
});

export default app;

