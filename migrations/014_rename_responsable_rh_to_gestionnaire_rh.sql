-- Migration: Rename Responsable RH to Gestionnaire RH
-- Created: 2025-11-22
-- Description: Updates the HR role name from "Responsable RH" to "Gestionnaire RH"
--              to match the updated codebase terminology

-- ============================================
-- PART 1: Update Role Name
-- ============================================

-- Update the role name in the roles table
-- Since users reference roles by ID (foreign key), this will automatically
-- apply to all users with the HR role
UPDATE roles
SET name = 'Gestionnaire RH'
WHERE name = 'Responsable RH';

-- ============================================
-- PART 2: Verify Data Integrity
-- ============================================

-- Verify the role exists with the new name
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM roles
  WHERE name = 'Gestionnaire RH';

  IF role_count = 0 THEN
    RAISE EXCEPTION 'Failed to update role name: Gestionnaire RH role not found after migration';
  END IF;

  -- Ensure no old role name remains
  SELECT COUNT(*) INTO role_count
  FROM roles
  WHERE name = 'Responsable RH';

  IF role_count > 0 THEN
    RAISE EXCEPTION 'Migration incomplete: Responsable RH role still exists';
  END IF;

  RAISE NOTICE 'Successfully renamed Responsable RH to Gestionnaire RH';
END $$;

-- ============================================
-- PART 3: Add Comment for Documentation
-- ============================================

COMMENT ON TABLE roles IS 'User roles table. The Gestionnaire RH role (formerly Responsable RH) has full HR administrative permissions.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the role change and user count
-- SELECT name, (SELECT COUNT(*) FROM users WHERE "roleId" = roles.id) as user_count
-- FROM roles
-- WHERE name = 'Gestionnaire RH';

-- Expected roles after migration:
-- 1. Collaborateur
-- 2. Manager
-- 3. Gestionnaire RH (renamed from Responsable RH)
-- 4. IT Admin

-- ============================================
-- ROLLBACK SCRIPT (Use with caution!)
-- ============================================

/*
-- To rollback this migration, run:
UPDATE roles
SET name = 'Responsable RH'
WHERE name = 'Gestionnaire RH';
*/
