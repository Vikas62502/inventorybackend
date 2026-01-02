-- Migration: Add finalAmount column to quotation_products table
-- Date: 2025-12-31
-- Description: Adds finalAmount column to store final amount (Subtotal - Subsidy, discount NOT applied)

-- Add finalAmount column if it doesn't exist
ALTER TABLE quotation_products 
ADD COLUMN IF NOT EXISTS "finalAmount" DECIMAL(12,2);

-- Add comment to column
COMMENT ON COLUMN quotation_products."finalAmount" IS 'Final amount (Subtotal - Subsidy, discount NOT applied)';

