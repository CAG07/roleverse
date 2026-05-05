-- supabase/migrations/20260306000000_fix_match_function_v2.sql
-- Migration 20260305 introduced two bugs in match_rules_embeddings:
--
--   Bug 1: Parameter typed as plain `vector` (no dimension, no schema prefix).
--     The campaign_embeddings.embedding column is extensions.vector(512).
--     PostgreSQL cannot resolve the <=> operator between plain `vector` and
--     extensions.vector(512), causing a runtime error on every RAG query.
--
--   Bug 2: LEFT JOIN to embedding_generations filters out all baseline rows.
--     ingest.ts manages generations by writing to campaign_embeddings.generation
--     and deleting old generation rows directly. It never calls
--     reserve_next_generation() or promote_generation(), so
--     embedding_generations.active_generation still reflects the seeded value
--     from when 20260305 was deployed. All newer generation rows are filtered
--     out by the JOIN condition, returning zero results.
--
-- Fix: drop all function variants that may exist and recreate with:
--   - Correct parameter type: extensions.vector(512) with explicit casts
--   - No embedding_generations JOIN (ingest.ts cleanup ensures only one
--     generation exists after each successful run, so no filtering needed)
--   - Threshold lowered from 0.5 to 0.3 (Voyage similarity scores run
--     cooler than OpenAI; 0.5 was cutting off valid matches including
--     common SRD content like "fireball")

-- Drop all known signature variants to ensure clean replacement
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
    (1 - (ce.embedding::extensions.vector(512) <=> query_embedding))::FLOAT AS similarity
  FROM public.campaign_embeddings ce
  WHERE ce.game_system = query_game_system
    AND (ce.campaign_id IS NULL OR ce.campaign_id = query_campaign_id)
    AND (1 - (ce.embedding::extensions.vector(512) <=> query_embedding)) > match_threshold
  ORDER BY ce.embedding::extensions.vector(512) <=> query_embedding
  LIMIT match_count;
END;
$$;
