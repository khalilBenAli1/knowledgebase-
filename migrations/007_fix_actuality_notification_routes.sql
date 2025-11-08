-- Migration: Fix actuality notification routes from /actualities to /actualites
-- The app uses French routes (/actualites) not English (/actualities)

-- Fix actuality comment notifications
UPDATE notifications
SET "actionUrl" = REPLACE("actionUrl", '/actualities/', '/actualites/')
WHERE type = 'actuality_comment'
  AND "actionUrl" LIKE '/actualities/%';

-- Fix actuality like notifications
UPDATE notifications
SET "actionUrl" = REPLACE("actionUrl", '/actualities/', '/actualites/')
WHERE type = 'actuality_like'
  AND "actionUrl" LIKE '/actualities/%';

-- Verify the changes
SELECT
  type,
  COUNT(*) as count,
  "actionUrl"
FROM notifications
WHERE type IN ('actuality_comment', 'actuality_like')
GROUP BY type, "actionUrl"
ORDER BY type;
