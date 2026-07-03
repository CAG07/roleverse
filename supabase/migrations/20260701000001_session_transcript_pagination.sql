-- Fetch a single transcript page server-side so session log requests do not
-- transfer the entire transcript JSONB payload on every page view.

CREATE OR REPLACE FUNCTION public.get_session_transcript_page(
  p_session_id UUID,
  p_campaign_id UUID,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  campaign_id UUID,
  user_id UUID,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  summary TEXT,
  transcript_page JSONB,
  transcript_total INTEGER,
  page INTEGER
)
LANGUAGE SQL
STABLE
AS $$
  WITH session_row AS (
    SELECT
      s.id,
      s.campaign_id,
      s.user_id,
      s.started_at,
      s.ended_at,
      s.summary,
      COALESCE(s.transcript, '[]'::jsonb) AS transcript,
      jsonb_array_length(COALESCE(s.transcript, '[]'::jsonb)) AS transcript_total
    FROM public.sessions s
    WHERE s.id = p_session_id
      AND s.campaign_id = p_campaign_id
  ),
  pagination AS (
    SELECT
      *,
      GREATEST(COALESCE(p_page_size, 50), 1) AS safe_page_size,
      LEAST(
        GREATEST(COALESCE(p_page, 1), 1),
        GREATEST(
          CEIL(
            jsonb_array_length(transcript)::numeric / GREATEST(COALESCE(p_page_size, 50), 1)
          )::integer,
          1
        )
      ) AS safe_page
    FROM session_row
  )
  SELECT
    p.id,
    p.campaign_id,
    p.user_id,
    p.started_at,
    p.ended_at,
    p.summary,
    COALESCE(
      (
        SELECT jsonb_agg(entry ORDER BY ordinality)
        FROM jsonb_array_elements(p.transcript) WITH ORDINALITY AS entries(entry, ordinality)
        WHERE ordinality > (p.safe_page - 1) * p.safe_page_size
          AND ordinality <= p.safe_page * p.safe_page_size
      ),
      '[]'::jsonb
    ) AS transcript_page,
    p.transcript_total,
    p.safe_page AS page
  FROM pagination p;
$$;
