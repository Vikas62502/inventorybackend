# Database Migrations

This directory contains Sequelize migration files for the Chairbord Solar Inventory Management System.

## Migration Files

The migrations are organized in chronological order:

1. **20250103000001-create-users.js** - Creates the users table
2. **20250103000002-create-products.js** - Creates the products table
3. **20250103000003-create-addresses.js** - Creates the addresses table
4. **20250103000004-create-admin-inventory.js** - Creates the admin_inventory table
5. **20250103000005-create-stock-requests.js** - Creates the stock_requests table
6. **20250103000006-create-stock-request-items.js** - Creates the stock_request_items table
7. **20250103000007-create-sales.js** - Creates the sales table
8. **20250103000008-create-sale-items.js** - Creates the sale_items table
9. **20250103000009-create-inventory-transactions.js** - Creates the inventory_transactions table
10. **20250103000010-create-stock-returns.js** - Creates the stock_returns table
11. **20250103000011-create-indexes.js** - Creates all database indexes
12. **20250103000012-create-triggers.js** - Creates triggers and functions
13. **20250103000013-create-views.js** - Creates database views

## Running Migrations

### Install Dependencies

First, make sure you have installed all dependencies:

```bash
npm install
```

### Run Migrations

To run all pending migrations:

```bash
npm run migrate
```

Or using sequelize-cli directly:

```bash
npx sequelize-cli db:migrate
```

### Undo Last Migration

To undo the last migration:

```bash
npm run migrate:undo
```

Or:

```bash
npx sequelize-cli db:migrate:undo
```

### Undo All Migrations

To undo all migrations:

```bash
npm run migrate:undo:all
```

Or:

```bash
npx sequelize-cli db:migrate:undo:all
```

## Database Configuration

The database configuration is stored in `config/database.json`. Make sure to update it with your database credentials before running migrations.

For production, you can use the `DATABASE_URL` environment variable instead of the JSON configuration.

## Environment Variables

The following environment variables can be used:

- `DB_NAME` - Database name (default: `chairbord_solar`)
- `DB_USER` - Database user (default: `postgres`)
- `DB_PASSWORD` - Database password
- `DB_HOST` - Database host (default: `localhost`)
- `DB_PORT` - Database port (default: `5432`)
- `DB_SSL` - Enable SSL (default: `false`)
- `DB_SSL_REJECT_UNAUTHORIZED` - Reject unauthorized SSL certificates (default: `true`)
- `DATABASE_URL` - Full database connection URL (for production)

## Notes

- Migrations are run in order based on their timestamp prefix
- All foreign key constraints are properly defined
- Check constraints are added for data validation
- Indexes are created for performance optimization
- Triggers are set up for automatic `updated_at` timestamp updates
- Views are created for reporting and analytics



