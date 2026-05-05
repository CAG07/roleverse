-- supabase/migrations/20260307000000_fix_match_function_v3.sql
-- The explicit ::extensions.vector(512) casts in v2 caused PostgreSQL to look
-- for operator extensions.<=> taking two extensions.vector arguments, which
-- fails. Fix: use operator(extensions.<=>) syntax to explicitly name the
-- operator with its schema, and remove the redundant body casts since the
-- parameter and column are already the same type.

DROP FUNCTION IF EXISTS public.match_rules_embeddings(vector, TEXT, UUID, FLOAT, INT);
DROP FUNCTION IF EXISTS public.match_rules_embeddings(extensions.vector, TEXT, UUID, FLOAT, INT);
DROP FUNCTION IF EXISTS public.match_rules_embeddings(extensions.vector(512), TEXT, UUID, FLOAT, INT);
DROP FUNCTION IF EXISTS public.match_rules_embeddings(extensions.vector(1024), TEXT, UUID, FLOAT, INT);
DROP FUNCTION IF EXISTS public.match_rules_embeddings(extensions.vector(1536), TEXT, UUID, FLOAT, INT);

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
SET search_path = 'public, extensions'
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
