-- Migration: Add Notifications, Manager Invitations, and Actuality Interactions
-- Created: 2025-01-08
-- Description: Adds notification system, manager invitation workflow, and actuality interactions (likes, comments, views)

-- ============================================
-- PART 1: Notifications Table
-- ============================================

CREATE TYPE "NotificationType" AS ENUM (
  'formation_request',
  'manager_invitation',
  'formation_approved',
  'formation_declined',
  'actuality_comment',
  'actuality_like',
  'system'
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type "NotificationType" NOT NULL,
  title varchar(500) NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  "isRead" boolean DEFAULT false,
  "actionUrl" varchar(255),
  "createdAt" timestamp DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications("userId");
CREATE INDEX idx_notifications_unread ON notifications("userId", "isRead") WHERE "isRead" = false;
CREATE INDEX idx_notifications_created ON notifications("createdAt" DESC);

-- ============================================
-- PART 2: Manager Invitations Table
-- ============================================

CREATE TYPE "InvitationStatus" AS ENUM (
  'pending',
  'accepted',
  'declined',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS manager_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "managerId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "collaboratorId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status "InvitationStatus" DEFAULT 'pending',
  message text,
  "respondedAt" timestamp,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

CREATE INDEX idx_manager_invitations_manager ON manager_invitations("managerId");
CREATE INDEX idx_manager_invitations_collaborator ON manager_invitations("collaboratorId");
CREATE INDEX idx_manager_invitations_status ON manager_invitations(status);
CREATE INDEX idx_manager_invitations_pending ON manager_invitations("collaboratorId", status) WHERE status = 'pending';

-- ============================================
-- PART 3: Actuality Interactions Table
-- ============================================

CREATE TYPE "InteractionType" AS ENUM (
  'view',
  'like'
);

CREATE TABLE IF NOT EXISTS actuality_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actualityId" uuid NOT NULL REFERENCES actualities(id) ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type "InteractionType" NOT NULL,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW(),
  UNIQUE("actualityId", "userId", type)
);

CREATE INDEX idx_actuality_interactions_actuality ON actuality_interactions("actualityId");
CREATE INDEX idx_actuality_interactions_user ON actuality_interactions("userId");
CREATE INDEX idx_actuality_interactions_type ON actuality_interactions("actualityId", type);

-- ============================================
-- PART 4: Actuality Comments Table
-- ============================================

CREATE TABLE IF NOT EXISTS actuality_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actualityId" uuid NOT NULL REFERENCES actualities(id) ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  "parentCommentId" uuid REFERENCES actuality_comments(id) ON DELETE CASCADE,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

CREATE INDEX idx_actuality_comments_actuality ON actuality_comments("actualityId");
CREATE INDEX idx_actuality_comments_user ON actuality_comments("userId");
CREATE INDEX idx_actuality_comments_parent ON actuality_comments("parentCommentId");
CREATE INDEX idx_actuality_comments_created ON actuality_comments("actualityId", "createdAt" DESC);

-- ============================================
-- PART 5: Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_manager_invitations_updated_at
  BEFORE UPDATE ON manager_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actuality_interactions_updated_at
  BEFORE UPDATE ON actuality_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actuality_comments_updated_at
  BEFORE UPDATE ON actuality_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
