-- supabase/migrations/20261031000000_session_play_time.sql
-- Time actually spent playing a session, saved once when the session ends
-- (app/api/sessions/[sessionId]/end/route.ts, computed by
-- lib/sessions/play-time.ts). Session History, the session log, and Campaign
-- Detail read this number instead of loading every session's full transcript
-- just to add up message timestamps.
--
-- Play time = the sum of gaps between consecutive points (started_at, then each
-- transcript entry's timestamp), leaving out any gap over 30 minutes (the
-- player stepped away). Null while a session is still open. Additive and
-- nullable; the existing "Users can update own sessions" policy covers writes.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS play_time_seconds INTEGER;

-- Backfill sessions that have already ended, with the same rule as the app.
WITH points AS (
  SELECT s.id, s.started_at AS t
  FROM public.sessions s
  WHERE s.ended_at IS NOT NULL AND s.started_at IS NOT NULL

  UNION ALL

  SELECT s.id, (e.value ->> 'timestamp')::timestamptz AS t
  FROM public.sessions s
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(s.transcript) = 'array' THEN s.transcript ELSE '[]'::jsonb END
  ) AS e(value)
  WHERE s.ended_at IS NOT NULL
    AND jsonb_typeof(e.value) = 'object'
    AND (e.value ->> 'timestamp') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}'
),
gaps AS (
  SELECT id, EXTRACT(EPOCH FROM t - LAG(t) OVER (PARTITION BY id ORDER BY t)) AS gap
  FROM points
),
totals AS (
  SELECT id, FLOOR(COALESCE(SUM(gap) FILTER (WHERE gap <= 1800), 0))::integer AS seconds
  FROM gaps
  GROUP BY id
)
UPDATE public.sessions s
SET play_time_seconds = totals.seconds
FROM totals
WHERE s.id = totals.id
  AND s.play_time_seconds IS NULL;
