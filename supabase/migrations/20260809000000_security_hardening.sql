-- ============================================================================
-- Security hardening pass (alpha-security branch)
--
-- Addresses four Supabase database-linter WARN findings:
--   1. function_search_path_mutable — 4 functions with no fixed search_path.
--   2. public_bucket_allows_listing — 3 public buckets with an unrestricted
--      SELECT policy on storage.objects, letting anyone enumerate every
--      file across every user's folder via .list().
--   3/4. anon/authenticated_security_definer_function_executable — 3
--      SECURITY DEFINER functions directly callable via public RPC that were
--      never meant to be called that way.
--
-- Verified against the live database before writing this (not guessed):
--   - All 4 search_path-mutable functions already fully qualify every
--     table/schema reference, so SET search_path = '' changes no logic.
--   - storage.objects policies are plain {public} role, matching the
--     migration files exactly (no drift).
--   - anon has full table-level grants on campaign_members (Supabase's
--     default posture, RLS is the intended restriction) — auth.uid() is
--     NULL for anon, so get_my_campaign_ids() already always returned zero
--     rows for anon; revoking EXECUTE just turns that into a permission
--     error instead of a silent empty result. authenticated keeps EXECUTE
--     since the "Members can view fellow members" RLS policy on
--     campaign_members calls this function on their behalf and would break
--     without it.
--   - rls_auto_enable() (pulled via pg_get_functiondef, not in any prior
--     migration — untracked schema drift, brought into version control
--     here) is an event-trigger function. pg_event_trigger_ddl_commands()
--     errors when called outside actual event-trigger execution, so the
--     public RPC exposure was already inert; revoking EXECUTE just removes
--     the unnecessary surface without changing its real behavior (event
--     trigger firing doesn't require grantee-level EXECUTE).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fixed search_path on the 4 flagged functions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.match_rules_embeddings(
  query_embedding extensions.vector(512),
  query_game_system TEXT,
  query_campaign_id UUID DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  source_type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.content,
    ce.metadata,
    ce.source_type,
    (1 - (ce.embedding operator(extensions.<=>) query_embedding))::FLOAT AS similarity
  FROM public.campaign_embeddings ce
  WHERE ce.game_system = query_game_system
    AND (ce.campaign_id IS NULL OR ce.campaign_id = query_campaign_id)
    AND (1 - (ce.embedding operator(extensions.<=>) query_embedding)) > match_threshold
  ORDER BY ce.embedding operator(extensions.<=>) query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_campaign_priority_embeddings(
  query_embedding extensions.vector(512),
  query_campaign_id UUID,
  source_types TEXT[],
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  source_type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH scored AS (
    SELECT
      ce.id,
      ce.content,
      ce.metadata,
      ce.source_type,
      (ce.embedding operator(extensions.<=>) query_embedding) AS distance
    FROM public.campaign_embeddings ce
    WHERE ce.campaign_id = query_campaign_id
      AND ce.source_type = ANY(source_types)
  )
  SELECT
    id,
    content,
    metadata,
    source_type,
    (1 - distance)::FLOAT AS similarity
  FROM scored
  WHERE (1 - distance) > match_threshold
  ORDER BY distance
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

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
SET search_path = ''
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

-- ----------------------------------------------------------------------------
-- 2. Narrow public-bucket SELECT policies to owner's own folder.
--    Public buckets serve objects by direct URL through a route that bypasses
--    this policy entirely (confirmed via Supabase's own linter guidance), so
--    this only removes the ability to .list() other users' folders — normal
--    image display anywhere in the app is unaffected.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view campaign covers" ON storage.objects;
CREATE POLICY "Anyone can view campaign covers"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'campaign-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Anyone can view campaign scenes" ON storage.objects;
CREATE POLICY "Anyone can view campaign scenes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'campaign-scenes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'character-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- 3. rls_auto_enable — bring into version control (was live-only, no prior
--    migration defined it) with its existing, already-correct search_path.
--    Body copied verbatim from the live definition, no logic changes.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Revoke unnecessary public RPC exposure on SECURITY DEFINER functions.
--    None of these need direct role-level EXECUTE to keep working: trigger
--    and event-trigger firing don't check grantee EXECUTE at all, and
--    authenticated keeps EXECUTE on get_my_campaign_ids() since the
--    campaign_members RLS policy calls it on their behalf.
-- ----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.handle_new_campaign() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

-- get_my_campaign_ids() was never granted EXECUTE directly to anon — it only
-- had the default PUBLIC grant every function gets unless revoked, so
-- "REVOKE ... FROM anon" alone would be a no-op (anon would still reach it
-- via PUBLIC). Revoke the PUBLIC grant outright, then re-grant only to
-- authenticated, which the campaign_members RLS policy needs.
REVOKE EXECUTE ON FUNCTION public.get_my_campaign_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_campaign_ids() TO authenticated;
