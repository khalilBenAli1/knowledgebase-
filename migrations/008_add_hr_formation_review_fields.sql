-- Migration: Add HR review fields to formation_requests table
-- Description: Adds three-stage approval workflow (Employee -> Manager -> HR)

-- Add MANAGER_APPROVED status to enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'manager_approved'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'FormationRequestStatus'
    )
  ) THEN
    ALTER TYPE "FormationRequestStatus" ADD VALUE 'manager_approved';
  END IF;
END $$;

-- Add HR review fields to formation_requests table
ALTER TABLE "formation_requests"
ADD COLUMN IF NOT EXISTS "hrResponse" text,
ADD COLUMN IF NOT EXISTS "hrReviewedBy" uuid,
ADD COLUMN IF NOT EXISTS "hrReviewedAt" timestamp;

-- Add foreign key constraint for hrReviewedBy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FK_formation_requests_hrReviewedBy'
  ) THEN
    ALTER TABLE "formation_requests"
    ADD CONSTRAINT "FK_formation_requests_hrReviewedBy"
    FOREIGN KEY ("hrReviewedBy") REFERENCES "users"("id")
    ON DELETE SET NULL;
  END IF;
END $$;
