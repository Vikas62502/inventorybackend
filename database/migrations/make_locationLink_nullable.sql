-- Migration: Make locationLink nullable in visits table
-- Date: 2025-12-31
-- Description: Makes locationLink optional to allow visits without location links

-- Make locationLink nullable
ALTER TABLE visits 
ALTER COLUMN "locationLink" DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN visits."locationLink" IS 'Optional location link (Google Maps, etc.)';

