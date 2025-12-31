-- Migration: Add totalAmount column to quotations table
-- Date: 2025-12-31
-- Description: Adds totalAmount column to store amount after discount (Subtotal - Subsidy - Discount)

-- Add totalAmount column if it doesn't exist
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Update existing records to set totalAmount = finalAmount (temporary fallback)
-- This is a fallback - ideally existing records should be updated with correct totalAmount values
UPDATE quotations 
SET "totalAmount" = "finalAmount" 
WHERE "totalAmount" = 0 AND "finalAmount" > 0;

-- Add comment to column
COMMENT ON COLUMN quotations."totalAmount" IS 'Amount after discount (Subtotal - Subsidy - Discount)';

