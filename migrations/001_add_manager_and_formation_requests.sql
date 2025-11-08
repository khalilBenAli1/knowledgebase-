-- Migration: Add Manager Role and Formation Requests
-- Created: 2025-01-08
-- Description: Adds Manager role, user hierarchy, email verification, and formation request system

-- ============================================
-- PART 1: Add Manager Role
-- ============================================

-- Add Manager to RoleName enum (if using enum type)
-- Note: PostgreSQL doesn't allow adding values to enums directly in production
-- You may need to recreate the enum or use a different approach
-- For now, we'll insert the role directly

-- Insert Manager role if not exists
INSERT INTO roles (id, name, permissions, "createdAt")
VALUES (
  gen_random_uuid(),
  'Manager',
  '{"canReviewFormationRequests": true, "canViewSubordinates": true, "canViewReports": true}'::jsonb,
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PART 2: Update Users Table
-- ============================================

-- Add manager relationship column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "managerId" uuid REFERENCES users(id) ON DELETE SET NULL;

-- Add email verification columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "isEmailVerified" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "emailVerificationToken" varchar(255),
ADD COLUMN IF NOT EXISTS "emailVerificationTokenExpires" timestamp;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users("managerId");
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users("isEmailVerified");
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users("emailVerificationToken");

-- ============================================
-- PART 3: Create Formation Requests System
-- ============================================

-- Create enum for formation request status
DO $$ BEGIN
    CREATE TYPE "FormationRequestStatus" AS ENUM (
        'pending',
        'approved',
        'declined',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create formation_requests table
CREATE TABLE IF NOT EXISTS formation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "formationId" uuid NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  "requesterId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "managerId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status "FormationRequestStatus" DEFAULT 'pending' NOT NULL,
  "requesterMessage" text,
  "managerResponse" text,
  "reviewedBy" uuid REFERENCES users(id) ON DELETE SET NULL,
  "reviewedAt" timestamp,
  "createdAt" timestamp DEFAULT NOW() NOT NULL,
  "updatedAt" timestamp DEFAULT NOW() NOT NULL
);

-- Create indexes for formation_requests
CREATE INDEX IF NOT EXISTS idx_formation_requests_formation ON formation_requests("formationId");
CREATE INDEX IF NOT EXISTS idx_formation_requests_requester ON formation_requests("requesterId");
CREATE INDEX IF NOT EXISTS idx_formation_requests_manager ON formation_requests("managerId");
CREATE INDEX IF NOT EXISTS idx_formation_requests_status ON formation_requests(status);
CREATE INDEX IF NOT EXISTS idx_formation_requests_created ON formation_requests("createdAt");

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_formation_requests_manager_status
ON formation_requests("managerId", status) WHERE status = 'pending';

-- ============================================
-- PART 4: Update Audit Log Actions (Optional)
-- ============================================

-- Add new audit actions if using enum
-- Note: Adjust this based on your audit log implementation

COMMENT ON TABLE formation_requests IS 'Stores formation training requests from users to their managers';
COMMENT ON COLUMN formation_requests."requesterMessage" IS 'Optional message from user explaining why they need this formation';
COMMENT ON COLUMN formation_requests."managerResponse" IS 'Manager response when approving or declining the request';
COMMENT ON COLUMN formation_requests."reviewedBy" IS 'User ID who reviewed the request (should match managerId)';
COMMENT ON COLUMN formation_requests."reviewedAt" IS 'Timestamp when the request was reviewed';

-- ============================================
-- PART 5: Create Trigger for updatedAt
-- ============================================

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for formation_requests
DROP TRIGGER IF EXISTS update_formation_requests_updated_at ON formation_requests;
CREATE TRIGGER update_formation_requests_updated_at
    BEFORE UPDATE ON formation_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 6: Sample Data (Optional - for testing)
-- ============================================

-- Uncomment to insert sample manager-user relationships
-- UPDATE users SET "managerId" = (SELECT id FROM users WHERE email = 'manager@biat.com.tn')
-- WHERE email IN ('user1@biat.com.tn', 'user2@biat.com.tn');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify Manager role exists
-- SELECT * FROM roles WHERE name = 'Manager';

-- Verify new columns in users table
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- AND column_name IN ('managerId', 'isEmailVerified', 'emailVerificationToken', 'emailVerificationTokenExpires');

-- Verify formation_requests table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'formation_requests';

-- Count indexes created
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('users', 'formation_requests');

-- ============================================
-- ROLLBACK SCRIPT (Use with caution!)
-- ============================================

/*
-- To rollback this migration:

-- Drop formation_requests table
DROP TABLE IF EXISTS formation_requests CASCADE;

-- Drop enum
DROP TYPE IF EXISTS "FormationRequestStatus";

-- Remove columns from users
ALTER TABLE users DROP COLUMN IF EXISTS "managerId";
ALTER TABLE users DROP COLUMN IF EXISTS "isEmailVerified";
ALTER TABLE users DROP COLUMN IF EXISTS "emailVerificationToken";
ALTER TABLE users DROP COLUMN IF EXISTS "emailVerificationTokenExpires";

-- Delete Manager role
DELETE FROM roles WHERE name = 'Manager';

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();
*/
