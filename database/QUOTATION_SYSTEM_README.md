# Solar Quotation Management System - Database Design

## Overview

This database schema is designed for the Solar Quotation Management System as specified in:
- `API_SPECIFICATION.txt`
- `DATABASE_SCHEMA.txt`
- `ER_DIAGRAM.txt`

## Database Files

### SQL Initialization
- **`init-quotation-system.sql`** - Complete PostgreSQL database schema with all tables, indexes, and constraints

### Sequelize Models
All models are located in `/models/` directory:

1. **`Dealer.ts`** - Dealers and admin users
2. **`Visitor.ts`** - Field agents/visitors
3. **`Customer.ts`** - Customer information
4. **`Quotation.ts`** - Main quotation records
5. **`QuotationProduct.ts`** - Product configuration for quotations (1:1)
6. **`CustomPanel.ts`** - Custom panel configurations
7. **`Visit.ts`** - Site visit scheduling and tracking
8. **`VisitAssignment.ts`** - Many-to-many relationship between visits and visitors
9. **`ProductCatalog.ts`** - Central product catalog
10. **`PricingRule.ts`** - Dynamic pricing rules
11. **`SystemConfig.ts`** - System-wide configuration

### Model Associations
- **`models/index-quotation.ts`** - All model associations and relationships

## Database Schema Summary

### Core Tables

#### 1. Users & Authentication
- **dealers** - Dealers and admin users (role: 'dealer' or 'admin')
- **visitors** - Field agents who conduct site visits

#### 2. Customers
- **customers** - Customer information linked to dealers

#### 3. Quotations
- **quotations** - Main quotation records with status tracking
- **quotation_products** - Product configuration (1:1 with quotations)
- **custom_panels** - Custom panel configurations for 'customize' system type

#### 4. Visits
- **visits** - Site visit scheduling and tracking
- **visit_assignments** - Many-to-many relationship between visits and visitors

#### 5. System Data
- **product_catalog** - Central product catalog for all product types
- **pricing_rules** - Dynamic pricing based on date ranges
- **system_config** - System-wide configuration key-value pairs

## Relationships

### One-to-Many
1. **dealers → customers** - One dealer creates many customers
2. **dealers → quotations** - One dealer creates many quotations
3. **dealers → visits** - One dealer creates many visits
4. **customers → quotations** - One customer can have many quotations
5. **quotations → custom_panels** - One quotation can have multiple custom panels
6. **quotations → visits** - One quotation can have multiple visits
7. **visits → visit_assignments** - One visit can have multiple visitor assignments

### One-to-One
1. **quotations → quotation_products** - Each quotation has one product configuration

### Many-to-Many
1. **visits ↔ visitors** - Through `visit_assignments` table

## Cascade Delete Rules

- Quotations deleted → cascade delete quotation_products
- Quotations deleted → cascade delete custom_panels
- Quotations deleted → cascade delete visits
- Visits deleted → cascade delete visit_assignments

## Key Indexes

### Performance Indexes
- `idx_quotation_dealer_status` - For dealer dashboard filtering
- `idx_quotation_date_status` - For recent quotations with status filter
- `idx_visit_dealer_date` - For dealer visit management
- `idx_visitor_assignments` - For visitor dashboard

### Unique Constraints
- `dealers.username` - Unique
- `dealers.email` - Unique
- `visitors.username` - Unique
- `visitors.email` - Unique
- `customers.mobile` - Unique
- `quotation_products.quotationId` - Unique (1:1 relationship)
- `visit_assignments(visitId, visitorId)` - Unique

## Status Enums

### Quotation Status
- `pending` - Initial state
- `approved` - Approved by admin
- `rejected` - Rejected by admin
- `completed` - Final state

### Visit Status
- `pending` - Initial state
- `approved` - Approved by visitor
- `completed` - Visit completed with measurements
- `incomplete` - Site not ready
- `rejected` - Visit rejected
- `rescheduled` - Visit rescheduled

### System Types
- `on-grid`
- `off-grid`
- `hybrid`
- `dcr`
- `non-dcr`
- `both`
- `customize`

## Setup Instructions

### 1. Create Database
```sql
CREATE DATABASE quotation_system;
```

### 2. Run Initialization Script
```bash
psql -U postgres -d quotation_system -f database/init-quotation-system.sql
```

### 3. Use Models in Application
```typescript
import { Dealer, Customer, Quotation, Visit } from './models/index-quotation';
```

## Notes

- All IDs are VARCHAR(50) - use UUID v4 for generation
- Passwords should be hashed using bcrypt
- Mobile numbers follow Indian 10-digit format
- PIN codes are 6-digit numeric
- Quotation IDs format: `QT-XXXXXX` (6 random alphanumeric chars)
- `validUntil` = `createdAt` + 5 days (default)
- Images stored as JSONB array in `visits.images`
- Specifications stored as JSONB in `product_catalog.specifications`

## Future Enhancements

Planned features that may require additional tables:
1. Payment tracking
2. Document management (PDF storage)
3. Email/SMS notifications log
4. Activity audit trail
5. Performance reports
6. Lead management
7. Inventory tracking
8. Service/maintenance scheduling


