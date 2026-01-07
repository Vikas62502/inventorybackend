const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const shouldUseSSL = (process.env.DB_SSL || '').toLowerCase() === 'true';
const allowUnauthorized = (process.env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() !== 'false';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'chairbord_solar',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
    dialectOptions: shouldUseSSL
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: allowUnauthorized
          }
        }
      : {}
  }
);

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    console.log('Running migration: Add pricing columns to quotations and quotation_products tables...');
    
    // First, check what columns exist in the quotations table
    const [allQuotationColumns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'quotations'
      ORDER BY column_name;
    `);
    
    console.log('   - Existing columns in quotations table:');
    allQuotationColumns.forEach((col) => {
      console.log(`     * ${col.column_name}`);
    });
    
    // Find the finalAmount column (could be finalAmount, final_amount, or finalamount)
    const finalCol = allQuotationColumns.find((col) => {
      const colName = col.column_name.toLowerCase();
      return colName === 'finalamount' || colName === 'final_amount';
    });
    
    let finalAmountColumn = finalCol ? finalCol.column_name : 'finalAmount';
    console.log(`   - Using finalAmount column: "${finalAmountColumn}"`);
    
    // For PostgreSQL, we need to quote identifiers if they have mixed case
    const needsQuotes = finalAmountColumn !== finalAmountColumn.toLowerCase();
    const finalAmountRef = needsQuotes ? `"${finalAmountColumn}"` : finalAmountColumn;
    
    console.log(`   - Final amount column reference: ${finalAmountRef}`);
    
    // Check quotation_products table columns
    const [allProductColumns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'quotation_products'
      ORDER BY column_name;
    `);
    
    console.log('   - Existing columns in quotation_products table:');
    allProductColumns.forEach((col) => {
      console.log(`     * ${col.column_name}`);
    });
    
    const migrationSQL = `
      -- ============================================
      -- QUOTATIONS TABLE MIGRATIONS
      -- ============================================
      
      -- Add subtotal column if it doesn't exist
      ALTER TABLE quotations 
      ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) NOT NULL DEFAULT 0;

      -- Add totalAmount column if it doesn't exist
      ALTER TABLE quotations 
      ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

      -- Add centralSubsidy column if it doesn't exist
      ALTER TABLE quotations 
      ADD COLUMN IF NOT EXISTS "centralSubsidy" DECIMAL(12,2) NOT NULL DEFAULT 0;

      -- Add stateSubsidy column if it doesn't exist
      ALTER TABLE quotations 
      ADD COLUMN IF NOT EXISTS "stateSubsidy" DECIMAL(12,2) NOT NULL DEFAULT 0;

      -- Add totalSubsidy column if it doesn't exist
      ALTER TABLE quotations 
      ADD COLUMN IF NOT EXISTS "totalSubsidy" DECIMAL(12,2) NOT NULL DEFAULT 0;

      -- Add amountAfterSubsidy column if it doesn't exist
      ALTER TABLE quotations 
      ADD COLUMN IF NOT EXISTS "amountAfterSubsidy" DECIMAL(12,2) NOT NULL DEFAULT 0;

      -- Add discountAmount column if it doesn't exist
      ALTER TABLE quotations 
      ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

      -- Update existing records to set subtotal = finalAmount (temporary fallback)
      UPDATE quotations 
      SET subtotal = ${finalAmountRef}
      WHERE subtotal = 0 AND ${finalAmountRef} > 0;

      -- Update existing records to set totalAmount = finalAmount (temporary fallback)
      UPDATE quotations 
      SET "totalAmount" = ${finalAmountRef}
      WHERE "totalAmount" = 0 AND ${finalAmountRef} > 0;

      -- ============================================
      -- QUOTATION_PRODUCTS TABLE MIGRATIONS
      -- ============================================
      
      -- Add finalAmount column if it doesn't exist
      ALTER TABLE quotation_products 
      ADD COLUMN IF NOT EXISTS "finalAmount" DECIMAL(12,2);
    `;
    
    console.log('   - Executing migration SQL...');

    await sequelize.query(migrationSQL);
    
    // Try to add comments (may fail if user doesn't have permission, that's okay)
    try {
      await sequelize.query(`
        COMMENT ON COLUMN quotations.subtotal IS 'Set price (complete package price)';
        COMMENT ON COLUMN quotations."totalAmount" IS 'Amount after discount (Subtotal - Subsidy - Discount)';
        COMMENT ON COLUMN quotations."finalAmount" IS 'Final amount (Subtotal - Subsidy, discount NOT applied)';
        COMMENT ON COLUMN quotations."centralSubsidy" IS 'Central government subsidy';
        COMMENT ON COLUMN quotations."stateSubsidy" IS 'State government subsidy';
        COMMENT ON COLUMN quotations."totalSubsidy" IS 'Total subsidy (central + state)';
        COMMENT ON COLUMN quotations."amountAfterSubsidy" IS 'Amount after subsidy';
        COMMENT ON COLUMN quotations."discountAmount" IS 'Discount amount';
        COMMENT ON COLUMN quotation_products."finalAmount" IS 'Final amount (Subtotal - Subsidy, discount NOT applied)';
      `);
    } catch (commentError) {
      console.log('⚠️  Could not add column comments (non-critical)');
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Added subtotal column to quotations table');
    console.log('   - Added totalAmount column to quotations table');
    console.log('   - Added centralSubsidy, stateSubsidy, totalSubsidy, amountAfterSubsidy, discountAmount to quotations table');
    console.log('   - Added finalAmount column to quotation_products table');
    console.log('   - Updated existing records');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    console.error('\nTroubleshooting:');
    console.error('   1. Check your .env file has correct DB credentials');
    console.error('   2. If using remote database, set DB_SSL=true in .env');
    console.error('   3. Ensure database user has ALTER TABLE permissions');
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

runMigration();

