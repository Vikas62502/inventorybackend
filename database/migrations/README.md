# Database Migrations

## Add Subtotal Column to Quotations Table

### Problem
The `subtotal` column is missing from the `quotations` table, causing queries to fail.

### Solution
Run the migration to add the `subtotal` column.

### Option 1: Using Node.js Script (Recommended)

```bash
node scripts/run-migration.js
```

### Option 2: Using psql directly

```bash
psql -U postgres -d chairbord_solar -f database/migrations/add_subtotal_to_quotations.sql
```

### Option 3: Using Sequelize Query

Connect to your database and run:

```sql
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE quotations 
SET subtotal = finalAmount 
WHERE subtotal = 0 AND finalAmount > 0;
```

### What the Migration Does

1. Adds `subtotal` column to `quotations` table
2. Sets default value to 0 for existing records
3. Updates existing records to use `finalAmount` as temporary `subtotal` value

### Verification

After running the migration, verify the column exists:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quotations' 
AND column_name = 'subtotal';
```

You should see:
```
column_name | data_type
------------|-----------
subtotal    | numeric
```
