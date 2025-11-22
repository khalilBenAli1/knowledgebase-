-- 016_add_chat_session_summary.sql
-- Adds the contextSummary column to chat_sessions so LLM summaries can persist per session

ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS "contextSummary" TEXT;
