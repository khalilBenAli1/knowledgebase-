-- Migration: Fix Manager Invitation Notification URLs
-- Created: 2025-11-22
-- Description: Updates old manager invitation notifications to point to the correct URL

-- Update old invitation notifications that point to /settings?tab=invitations
UPDATE notifications
SET "actionUrl" = '/manager?tab=received-invitations'
WHERE type = 'manager_invitation'
  AND ("actionUrl" = '/settings?tab=invitations' OR "actionUrl" LIKE '/settings%');

-- Verify the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM notifications
  WHERE type = 'manager_invitation'
    AND "actionUrl" = '/manager?tab=received-invitations';

  RAISE NOTICE 'Updated % manager invitation notification(s)', updated_count;
END $$;
