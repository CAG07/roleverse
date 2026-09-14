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

DROP POLICY IF EXISTS "Users can view own rate limit rows" ON public.message_rate_limits;
CREATE POLICY "Users can view own rate limit rows"
  ON public.message_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rate limit rows" ON public.message_rate_limits;
CREATE POLICY "Users can insert own rate limit rows"
  ON public.message_rate_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rate limit rows" ON public.message_rate_limits;
CREATE POLICY "Users can update own rate limit rows"
  ON public.message_rate_limits FOR UPDATE
  USING (auth.uid() = user_id);

-- Atomic increment-with-cap. Runs as invoker (no SECURITY DEFINER), same as
-- append_session_transcript, relying on the RLS policies above — p_user_id
-- must equal auth.uid() for the INSERT/UPDATE to succeed at all.
-- Returns the new count if the increment succeeded (i.e. was under cap),
-- or NULL if the cap was already reached (no row returned/updated).
CREATE OR REPLACE FUNCTION public.increment_message_rate_limit(
  p_user_id UUID,
  p_cap INTEGER
)
RETURNS INTEGER
LANGUAGE SQL
SET search_path = ''
AS $$
  INSERT INTO public.message_rate_limits (user_id, day, message_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, day)
  DO UPDATE SET message_count = public.message_rate_limits.message_count + 1
  WHERE public.message_rate_limits.message_count < p_cap
  RETURNING message_count;
$$;

COMMENT ON TABLE public.message_rate_limits IS
  'Per-user, per-calendar-day message counter for app/api/sessions/[sessionId]/message/route.ts. Capped at MESSAGE_DAILY_LIMIT (lib/sessions/rate-limit.ts). No cron reset needed — a new day is a new row.';
