-- Migration: Add subtotal column to quotations table
-- Date: 2025-12-26
-- Description: Adds subtotal column to store total project cost before subsidies

-- Add subtotal column if it doesn't exist
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Update existing records to set subtotal = finalAmount (temporary, should be updated with actual values)
-- This is a fallback - ideally existing records should be updated with correct subtotal values
UPDATE quotations 
SET subtotal = finalAmount 
WHERE subtotal = 0 AND finalAmount > 0;

-- Add comment to column
COMMENT ON COLUMN quotations.subtotal IS 'Total project cost before subsidies (editable field from frontend)';

