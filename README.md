# Chairbord Solar Inventory Management System - Backend API

A comprehensive Node.js backend API for managing multi-level inventory for solar products with role-based access control.

## Features

- **Multi-level Inventory Management**: Central inventory (Super Admin) and distributed inventory (Admins)
- **Role-based Access Control**: Super Admin, Admin, Agent, and Account Manager roles
- **Stock Request System**: Request, dispatch, and confirm stock transfers with image uploads
- **Sales Management**: B2B and B2C sales tracking with bill confirmation
- **Inventory Transactions**: Complete audit trail of all inventory movements
- **Stock Returns**: Admin to Super Admin stock return system
- **JWT Authentication**: Secure token-based authentication
- **File Upload Support**: Image uploads for products, dispatch confirmations, and bills

## Tech Stack

- **Node.js** with Express.js
- **PostgreSQL** database
- **Sequelize** ORM for database operations
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd inventorybackend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=chairbord_solar
DB_PORT=5432

JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRE=7d

PORT=3000
NODE_ENV=development

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

5. Create the PostgreSQL database and run the schema SQL:
```bash
# Create database
createdb chairbord_solar

# Run initialization script
psql -U postgres -d chairbord_solar -f database/init-postgres.sql
```

6. Start the server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (authenticated)

### Users
- `GET /api/users` - Get all users (super-admin, admin)
- `GET /api/users/:id` - Get user by ID (super-admin, admin)
- `POST /api/users` - Create user (super-admin can create any role; admins can create inactive agents)
- `PUT /api/users/:id` - Update user (super-admin)
- `DELETE /api/users/:id` - Delete user (super-admin)

> Agents created by admins remain inactive (`is_active = false`) until a super-admin approves them via `PUT /api/users/:id`.

### Categories
- `GET /api/categories` - Get distinct category labels from products (public)
- `GET /api/categories/:label` - Check if a category label exists (public)

### Products
- `GET /api/products` - Get all products (public)
- `GET /api/products/:id` - Get product by ID (public)
- `GET /api/products/inventory/levels` - Get inventory levels (authenticated)
- `POST /api/products` - Create product (super-admin)
- `PUT /api/products/:id` - Update product (super-admin)
- `DELETE /api/products/:id` - Delete product (super-admin)

### Admin Inventory
- `GET /api/admin-inventory` - Get all admin inventory (authenticated)
- `GET /api/admin-inventory/admin/:adminId` - Get inventory for specific admin (authenticated)
- `GET /api/admin-inventory/:id` - Get admin inventory by ID (authenticated)
- `POST /api/admin-inventory` - Create/Update admin inventory (super-admin)
- `PUT /api/admin-inventory/:id` - Update admin inventory (super-admin)
- `DELETE /api/admin-inventory/:id` - Delete admin inventory (super-admin)

### Stock Requests
- `GET /api/stock-requests` - Get all stock requests (authenticated)
- `GET /api/stock-requests/:id` - Get stock request by ID (authenticated)
- `POST /api/stock-requests` - Create stock request (admin, agent)
- `POST /api/stock-requests/:id/dispatch` - Dispatch stock request (super-admin, admin)
- `POST /api/stock-requests/:id/confirm` - Confirm stock receipt (requester)
- `PUT /api/stock-requests/:id` - Update stock request (requester)
- `DELETE /api/stock-requests/:id` - Delete stock request (requester, super-admin)

### Sales
- `GET /api/sales` - Get all sales (authenticated)
- `GET /api/sales/summary` - Get sales summary (authenticated)
- `GET /api/sales/:id` - Get sale by ID (authenticated)
- `POST /api/sales` - Create sale (agent, admin)
- `PUT /api/sales/:id` - Update sale (creator, admin, super-admin)
- `POST /api/sales/:id/confirm-bill` - Confirm B2B bill (account)
- `DELETE /api/sales/:id` - Delete sale (creator, super-admin)

### Inventory Transactions
- `GET /api/inventory-transactions` - Get all transactions (authenticated)
- `GET /api/inventory-transactions/:id` - Get transaction by ID (authenticated)
- `POST /api/inventory-transactions` - Create transaction (super-admin, admin)

### Stock Returns
- `GET /api/stock-returns` - Get all stock returns (authenticated)
- `GET /api/stock-returns/:id` - Get stock return by ID (authenticated)
- `POST /api/stock-returns` - Create stock return (admin)
- `POST /api/stock-returns/:id/process` - Process stock return (super-admin)
- `PUT /api/stock-returns/:id` - Update stock return (admin, super-admin)
- `DELETE /api/stock-returns/:id` - Delete stock return (admin, super-admin)

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Role Permissions

### Super Admin
- Full access to all endpoints
- Manages products, users
- Dispatches stock requests from central inventory
- Processes stock returns

### Admin
- Manages own inventory
- Creates stock requests from super-admin or other admins
- Dispatches stock requests to agents
- Creates sales
- Views reports

### Agent
- Creates stock requests from admins (multi-product)
- Creates sales (B2B/B2C)
- Views own requests and sales

### Account Manager
- Confirms B2B bills
- Views sales data

## File Uploads

Uploaded files are stored in the `./uploads` directory and served at `/uploads/<filename>`.

Supported file types: JPEG, JPG, PNG, GIF, PDF
Max file size: 5MB (configurable)

## Database Models

The application uses Sequelize ORM with the following models:
- `users` - User accounts with roles, activation status, and creator tracking
- `products` - Central inventory products
- `admin_inventory` - Distributed inventory for admins
- `stock_requests` - Stock request headers
- `stock_request_items` - Stock request line items
- `addresses` - Reusable billing/delivery addresses
- `sales` - Sales headers (B2B/B2C)
- `sale_items` - Sales line items
- `inventory_transactions` - Audit trail
- `stock_returns` - Stock return tracking

All models are defined in the `models/` directory with proper associations and relationships. The database schema is PostgreSQL-compatible and can be initialized using the `database/init-postgres.sql` script.

## Error Handling

The API returns standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

Error responses include a JSON object with an `error` field:
```json
{
  "error": "Error message"
}
```

## Development

### Project Structure
```
inventorybackend/
├── config/
│   └── database.js          # Database configuration
├── controllers/            # Request handlers
│   ├── authController.js
│   ├── userController.js
│   ├── categoryController.js
│   ├── productController.js
│   ├── adminInventoryController.js
│   ├── stockRequestController.js
│   ├── salesController.js
│   ├── inventoryTransactionController.js
│   └── stockReturnController.js
├── middleware/
│   ├── auth.js             # Authentication & authorization
│   └── upload.js           # File upload configuration
├── routes/                 # API routes
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── categoryRoutes.js
│   ├── productRoutes.js
│   ├── adminInventoryRoutes.js
│   ├── stockRequestRoutes.js
│   ├── salesRoutes.js
│   ├── inventoryTransactionRoutes.js
│   └── stockReturnRoutes.js
├── uploads/                # Uploaded files directory
├── .env                    # Environment variables (not in git)
├── .env.example            # Environment variables template
├── .gitignore
├── package.json
├── server.js               # Main server file
└── README.md
```

## License

ISC

# inventorybackend
