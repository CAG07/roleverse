-- supabase/migrations/20260701000000_session_summaries.sql
-- Adds AI-generated session summaries for cross-session continuity.
-- summary IS NULL means the session predates this feature or generation failed.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS summary_generated_at TIMESTAMPTZ;
