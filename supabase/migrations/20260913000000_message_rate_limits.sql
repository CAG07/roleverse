-- Per-user daily message cap on the AI chat endpoint
-- (app/api/sessions/[sessionId]/message/route.ts).
--
-- Calendar-day-keyed counter table, natural key per day — no cron reset
-- needed, a new day just gets a new row on first use. Incremented via a
-- single atomic UPSERT statement (increment_message_rate_limit below),
-- following the same "atomic RPC over SELECT-then-UPDATE" precedent as
-- append_session_transcript (20260802000000_atomic_transcript_append.sql)
-- rather than the optimistic-CAS pattern used for the lower-traffic
-- generation-limit counters in campaigns.character_generation_count /
-- npc_generation_count (20260819000000_campaign_generation_limits.sql) —
-- that CAS is explicitly a "soft guard, good enough for occasional clicks,"
-- not strong enough for a check firing on every chat message.

CREATE TABLE IF NOT EXISTS public.message_rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.message_rate_limits ENABLE ROW LEVEL SECURITY;

-- SELECT only — lets a user see their own usage if ever surfaced in the UI.
-- Deliberately NO client INSERT/UPDATE policy. Every write goes through the
-- SECURITY DEFINER function below instead: a client-writable counter column
-- (even one scoped to auth.uid() = user_id) would let a user PATCH their own
-- message_count directly via PostgREST to reset or lower it, defeating the
-- cap entirely — this closes that off completely rather than trying to
-- constrain the value a WITH CHECK clause would allow.
DROP POLICY IF EXISTS "Users can view own rate limit rows" ON public.message_rate_limits;
CREATE POLICY "Users can view own rate limit rows"
  ON public.message_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Atomic increment-with-cap. SECURITY DEFINER so it can write despite there
-- being no client INSERT/UPDATE policy — but a SECURITY DEFINER function is
-- only as safe as what it trusts from the caller, so it takes NO arguments:
-- the acting user comes from auth.uid() (never a caller-supplied user_id,
-- which a malicious direct RPC call could otherwise point at someone else's
-- row), and the cap is a hardcoded literal (never a caller-supplied p_cap,
-- which could otherwise be inflated past what the server intends to allow).
-- Keep this literal in sync with MESSAGE_DAILY_LIMIT
-- (lib/sessions/rate-limit.ts, used for the user-facing message only) by
-- hand — changing the cap means a new migration that CREATE OR REPLACEs
-- this function with the new value, same as any other deployed migration.
-- Returns the new count if the increment succeeded (i.e. was under cap),
-- or NULL if the cap was already reached (no row returned/updated).
CREATE OR REPLACE FUNCTION public.increment_message_rate_limit()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.message_rate_limits (user_id, day, message_count)
  VALUES (auth.uid(), CURRENT_DATE, 1)
  ON CONFLICT (user_id, day)
  DO UPDATE SET message_count = public.message_rate_limits.message_count + 1
  WHERE public.message_rate_limits.message_count < 75
  RETURNING message_count;
$$;

COMMENT ON TABLE public.message_rate_limits IS
  'Per-user, per-calendar-day message counter for app/api/sessions/[sessionId]/message/route.ts. Capped at MESSAGE_DAILY_LIMIT (lib/sessions/rate-limit.ts). No cron reset needed — a new day is a new row.';
