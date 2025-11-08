-- Migration: Add new notification types to enum
-- This migration adds the missing notification types to the NotificationType enum

-- Add new values to the NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'manager_assigned';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'collaborator_assigned';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'collaborator_removed';

-- Verify the enum values
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'NotificationType'
ORDER BY enumlabel;
