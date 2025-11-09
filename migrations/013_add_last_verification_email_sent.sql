-- Migration: Add lastVerificationEmailSent column to users table
-- Description: Adds a timestamp column to track when the last verification email was sent
--              This is used to implement a cooldown period (1 minute) between email resends

-- Add lastVerificationEmailSent column to users table
ALTER TABLE users
ADD COLUMN "lastVerificationEmailSent" TIMESTAMP DEFAULT NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN users."lastVerificationEmailSent" IS 'Timestamp of when the last verification email was sent to the user';
