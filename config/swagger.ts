import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Chairbord Solar Inventory Management API',
    version: '1.0.0',
    description: 'Backend API for Chairbord Solar Inventory Management System',
    contact: {
      name: 'API Support'
    }
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 3000}/api`,
      description: 'Development server'
    },
    {
      url: `${process.env.PROD_URL || 'https://api.chairbord.com'}/api`,
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message'
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['super-admin', 'admin', 'agent', 'account'] },
          is_active: { type: 'boolean' },
          created_by_id: { type: 'string', nullable: true },
          created_by_name: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          model: { type: 'string' },
          wattage: { type: 'string', nullable: true },
          category: { type: 'string' },
          quantity: { type: 'integer' },
          unit_price: { type: 'number', nullable: true },
          image: { type: 'string', nullable: true },
          created_by: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' }
            }
          }
        }
      }
    }
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Users', description: 'User management endpoints' },
    { name: 'Products', description: 'Product management endpoints' },
    { name: 'Categories', description: 'Category endpoints' },
    { name: 'Admin Inventory', description: 'Admin inventory management endpoints' },
    { name: 'Stock Requests', description: 'Stock request endpoints' },
    { name: 'Sales', description: 'Sales management endpoints' },
    { name: 'Inventory Transactions', description: 'Inventory transaction endpoints' },
    { name: 'Stock Returns', description: 'Stock return endpoints' }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: ['./routes/*.ts', './controllers/*.ts'] // Path to the API files
};

export const swaggerSpec = swaggerJsdoc(options);

