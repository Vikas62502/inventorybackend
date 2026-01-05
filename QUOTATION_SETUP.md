# Quotation System Setup Guide

This guide explains how to set up the database and create the default admin user for the Solar Quotation Management System.

## Prerequisites

1. PostgreSQL database is running
2. Environment variables are configured in `.env` file:
   ```env
   DB_HOST=localhost
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=chairbord_solar
   DB_PORT=5432
   ```

## Setup Steps

### Option 1: Run Migrations and Create Admin (Recommended)

Run the automated setup script that will:
1. Execute all database migrations
2. Create the default admin user

```bash
npm run init:quotation
```

This will:
- Run all migrations from `database/migrations/` (quotation system tables)
- Create a default admin user with:
  - **Username**: `admin`
  - **Password**: `admin123`
  - **Name**: `Admin User`
  - **Email**: `admin@chairbord.com`
  - **Mobile**: `9876543210`
  - **Role**: `admin`

### Option 2: Run Steps Separately

If you prefer to run migrations and create admin separately:

#### Step 1: Run Migrations Only

```bash
npm run migrate
```

This will create all the quotation system tables:
- dealers
- visitors
- customers
- quotations
- quotation_products
- custom_panels
- visits
- visit_assignments
- product_catalog
- pricing_rules
- system_config

#### Step 2: Create Admin User Only

```bash
npm run init:quotation
```

Note: The script will skip migration if tables already exist, and will skip admin creation if admin already exists.

## Default Admin Credentials

After running the setup, you can log in with:

- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `admin`

**⚠️ Important**: Change the default password after first login in production!

## Troubleshooting

### Migration Errors

If migrations fail:
1. Check database connection in `.env`
2. Ensure PostgreSQL is running
3. Verify database exists: `createdb chairbord_solar` (if needed)
4. Check migration files in `database/migrations/`

### Admin Already Exists

If you see "Admin user already exists", the admin was created previously. You can:
- Use existing credentials
- Delete the admin from database and re-run the script
- Update the admin password manually

### Rollback Migrations

To undo the last migration:
```bash
npm run migrate:undo
```

To undo all migrations:
```bash
npm run migrate:undo:all
```

## Verification

After setup, verify the admin was created:

```sql
SELECT id, username, "firstName", "lastName", email, role, "isActive" 
FROM dealers 
WHERE username = 'admin';
```

You should see the admin user with `role = 'admin'` and `isActive = true`.

## Next Steps

1. Start the server: `npm run dev`
2. Test login: `POST /api/auth/login` with admin credentials
3. Create additional dealers/visitors as needed through the admin API
