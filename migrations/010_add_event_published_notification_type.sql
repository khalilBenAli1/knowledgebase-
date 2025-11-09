-- Migration: Add EVENT_PUBLISHED notification type
-- This migration adds the EVENT_PUBLISHED notification type to support event notifications

-- Add event_published to the NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'event_published';

-- Verify the enum values
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'NotificationType'
ORDER BY enumlabel;
