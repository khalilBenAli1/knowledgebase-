-- Migration: Add custom formation request fields
-- This migration adds fields to support custom formation requests where users can request formations not in the catalog

-- Make formationId nullable to support custom requests
ALTER TABLE formation_requests
ALTER COLUMN "formationId" DROP NOT NULL;

-- Add custom formation request fields
ALTER TABLE formation_requests
ADD COLUMN IF NOT EXISTS "customFormationTitle" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "customFormationDetails" TEXT,
ADD COLUMN IF NOT EXISTS "customFormationLink" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "customFormationDate" TIMESTAMP;

-- Add constraint to ensure either formationId OR customFormationTitle is provided
ALTER TABLE formation_requests
ADD CONSTRAINT check_formation_request_type
CHECK (
  ("formationId" IS NOT NULL AND "customFormationTitle" IS NULL)
  OR
  ("formationId" IS NULL AND "customFormationTitle" IS NOT NULL)
);
