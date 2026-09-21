-- supabase/migrations/20260822000000_session_scene_media_persistence.sql
-- Persists the currently-attached Scene Display media per session, so it
-- survives navigating away and back (or a page reload) instead of resetting
-- to empty every time SessionPageClient remounts. Straightforward additive
-- column — no new table, no RLS policy needed (covered by the existing
-- row-level policies on public.sessions).

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS scene_media jsonb;
