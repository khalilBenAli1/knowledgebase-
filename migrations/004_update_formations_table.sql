-- Migration: Update formations table with catalog fields
-- Date: 2025-11-08
-- Description: Add duration, location, maxParticipants fields and rename createdBy column to createdById

-- Add new columns to formations table
ALTER TABLE formations
ADD COLUMN IF NOT EXISTS duration VARCHAR,
ADD COLUMN IF NOT EXISTS location VARCHAR,
ADD COLUMN IF NOT EXISTS max_participants INTEGER;

-- Rename createdBy column to createdById (if it exists as createdBy)
-- Note: This assumes the column might be named 'createdBy' in the database
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'formations'
        AND column_name = 'createdBy'
    ) THEN
        ALTER TABLE formations RENAME COLUMN "createdBy" TO "createdById";
    END IF;
END $$;

-- Ensure createdById column exists (in case it was already named correctly)
ALTER TABLE formations
ADD COLUMN IF NOT EXISTS "createdById" UUID;

-- Update published default to false (if it's currently true)
ALTER TABLE formations
ALTER COLUMN published SET DEFAULT false;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_formations_created_by'
        AND table_name = 'formations'
    ) THEN
        ALTER TABLE formations
        ADD CONSTRAINT fk_formations_created_by
        FOREIGN KEY ("createdById") REFERENCES users(id);
    END IF;
END $$;

-- Create index for better performance on createdById lookups
CREATE INDEX IF NOT EXISTS idx_formations_created_by ON formations("createdById");
CREATE INDEX IF NOT EXISTS idx_formations_published ON formations(published);
