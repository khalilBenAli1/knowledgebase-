-- Migration to add HR review fields to formation_requests table
-- Run this SQL script on your PostgreSQL database

-- Add new status to enum
ALTER TYPE "FormationRequestStatus" ADD VALUE IF NOT EXISTS 'manager_approved';

-- Add HR review fields
ALTER TABLE "formation_requests"
ADD COLUMN IF NOT EXISTS "hrResponse" text,
ADD COLUMN IF NOT EXISTS "hrReviewedBy" uuid,
ADD COLUMN IF NOT EXISTS "hrReviewedAt" timestamp;

-- Add foreign key constraint for hrReviewedBy
ALTER TABLE "formation_requests"
ADD CONSTRAINT "FK_formation_requests_hrReviewedBy"
FOREIGN KEY ("hrReviewedBy") REFERENCES "users"("id")
ON DELETE SET NULL;
