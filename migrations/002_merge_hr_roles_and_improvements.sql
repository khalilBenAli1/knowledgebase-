-- Migration: Merge HR Roles and Apply Improvements
-- Created: 2025-01-08
-- Description: Merges HR roles, updates Tesseract configuration

-- ============================================
-- PART 1: Merge HR Roles
-- ============================================

-- Update all users with "Gestionnaire RH" role to "Responsable RH"
UPDATE users
SET "roleId" = (SELECT id FROM roles WHERE name = 'Responsable RH')
WHERE "roleId" = (SELECT id FROM roles WHERE name = 'Gestionnaire RH');

-- Delete the "Gestionnaire RH" role
DELETE FROM roles WHERE name = 'Gestionnaire RH';

-- Update permissions for Responsable RH (merged role with all HR capabilities)
UPDATE roles
SET permissions = '{
  "canManageDocuments": true,
  "canApproveDocuments": true,
  "canManageUsers": true,
  "canViewAllSessions": true,
  "canManageFormations": true,
  "canManageActualities": true,
  "canViewAnalytics": true,
  "canReviewFormationRequests": true,
  "canAssignManagers": true
}'::jsonb
WHERE name = 'Responsable RH';

-- ============================================
-- PART 2: Verify Data Integrity
-- ============================================

-- Check that no orphaned users exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users WHERE "roleId" NOT IN (SELECT id FROM roles)
  ) THEN
    RAISE EXCEPTION 'Found users with invalid roleId after migration';
  END IF;
END $$;

-- ============================================
-- PART 3: Add Comments for Documentation
-- ============================================

COMMENT ON COLUMN roles.permissions IS 'JSONB object containing role permissions. Merged HR roles have all HR-related permissions.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify only 4 roles exist now
-- SELECT name, (SELECT COUNT(*) FROM users WHERE "roleId" = roles.id) as user_count
-- FROM roles
-- ORDER BY name;

-- Expected output:
-- Collaborateur     | N users
-- Manager           | N users
-- Responsable RH    | N users (merged)
-- IT Admin          | N users

-- ============================================
-- ROLLBACK SCRIPT (Use with caution!)
-- ============================================

/*
-- To rollback this migration:

-- 1. Recreate Gestionnaire RH role
INSERT INTO roles (id, name, permissions, "createdAt")
VALUES (
  gen_random_uuid(),
  'Gestionnaire RH',
  '{"canManageDocuments": true, "canApproveDocuments": true}'::jsonb,
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- 2. Manually reassign users if needed
-- UPDATE users SET "roleId" = (SELECT id FROM roles WHERE name = 'Gestionnaire RH')
-- WHERE email IN ('user1@example.com', 'user2@example.com');
*/
