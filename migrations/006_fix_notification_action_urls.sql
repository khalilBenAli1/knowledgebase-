-- Migration: Fix notification actionUrl routes
-- This migration updates all existing notification actionUrl values to use the correct routes

-- Fix manager invitation notifications
-- Old: /profile/manager-invitations/{id}
-- New: /settings?tab=invitations
UPDATE notifications
SET "actionUrl" = '/settings?tab=invitations'
WHERE type = 'manager_invitation'
  AND "actionUrl" LIKE '/profile/manager-invitations/%';

-- Fix formation request notifications
-- Old: /manager/formation-requests/{id}
-- New: /manager?tab=requests
UPDATE notifications
SET "actionUrl" = '/manager?tab=requests'
WHERE type = 'formation_request'
  AND ("actionUrl" LIKE '/manager/formation-requests/%' OR "actionUrl" IS NULL);

-- Fix formation approved notifications
-- New: /formations
UPDATE notifications
SET "actionUrl" = '/formations'
WHERE type = 'formation_approved'
  AND ("actionUrl" IS NULL OR "actionUrl" = '');

-- Fix formation declined notifications
-- New: /formations
UPDATE notifications
SET "actionUrl" = '/formations'
WHERE type = 'formation_declined'
  AND ("actionUrl" IS NULL OR "actionUrl" = '');

-- Fix collaborator assigned notifications
-- Old: various
-- New: /manager?tab=team
UPDATE notifications
SET "actionUrl" = '/manager?tab=team'
WHERE type = 'collaborator_assigned'
  AND ("actionUrl" != '/manager?tab=team' OR "actionUrl" IS NULL);

-- Fix collaborator removed notifications
-- Old: various
-- New: /manager?tab=team
UPDATE notifications
SET "actionUrl" = '/manager?tab=team'
WHERE type = 'collaborator_removed'
  AND ("actionUrl" != '/manager?tab=team' OR "actionUrl" IS NULL);

-- Fix manager assigned notifications
-- Old: various
-- New: /settings
UPDATE notifications
SET "actionUrl" = '/settings'
WHERE type = 'manager_assigned'
  AND ("actionUrl" != '/settings' OR "actionUrl" IS NULL);

-- Actuality comment and like notifications should already be correct
-- They use: /actualites/{id}
-- No changes needed for these

-- Log the changes
SELECT
  type,
  COUNT(*) as updated_count,
  "actionUrl"
FROM notifications
WHERE
  type IN (
    'manager_invitation',
    'formation_request',
    'formation_approved',
    'formation_declined',
    'collaborator_assigned',
    'collaborator_removed',
    'manager_assigned'
  )
GROUP BY type, "actionUrl"
ORDER BY type;
