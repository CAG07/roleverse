-- ============================================================================
-- Per-campaign "AI Assist" toggle — lets a campaign run with no AI Game
-- Master chat at all, for players who don't want an LLM in front of them.
--
-- When false, the session page (components/session/SessionPageClient.tsx)
-- renders a freeform JournalPanel instead of ChatWindow. Journal entries are
-- appended into the SAME sessions.transcript JSONB via the existing
-- append_session_transcript RPC (see 20250101000000_initial_schema.sql /
-- wherever that function was defined) — no new transcript shape, no new
-- table. Quick Oracle (already zero-AI, client-side) and character sheets
-- remain available regardless of this setting.
--
-- Additive column, same shape as campaigns.oracle_state / module_description:
-- a plain settings field, never branched on inside any agent/tool, only read
-- by the session page to decide which panel to render.
-- ============================================================================

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS ai_assist_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.campaigns.ai_assist_enabled IS
  'When false, the session page shows a freeform journal panel (components/session/JournalPanel.tsx) instead of the AI Game Master chat (ChatWindow.tsx). Oracle tools and character sheets remain available either way. Defaults to true so existing campaigns keep current chat behavior unchanged.';
