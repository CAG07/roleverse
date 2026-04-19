-- supabase/migrations/20260303000000_fix_vector_512.sql
-- Fix vector dimension mismatch.
-- 20260302000000 set the column to vector(1024) expecting Voyage voyage-3.
-- The ingestion pipeline uses voyage-3-lite which outputs 512 dimensions.
-- This migration corrects the column and all dependent objects to 512.
-- Table is empty so no data migration is needed.

-- ============================================================================
-- 1. Drop the HNSW index (dimension-specific — must be dropped before ALTER)
-- ============================================================================

DROP INDEX IF EXISTS campaign_embeddings_vector_idx;

-- ============================================================================
-- 2. Change the embedding column from vector(1024) to vector(512)
-- ============================================================================

ALTER TABLE public.campaign_embeddings
  ALTER COLUMN embedding TYPE extensions.vector(512);

-- ============================================================================
-- 3. Recreate the HNSW index for the new dimension
-- ============================================================================

CREATE INDEX campaign_embeddings_vector_idx
  ON public.campaign_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops);

-- ============================================================================
-- 4. Replace match_rules_embeddings with the 512-dimension signature
--    Drop by exact signature since overloading is possible.
-- ============================================================================

DROP FUNCTION IF EXISTS public.match_rules_embeddings(
  extensions.vector(1024), TEXT, UUID, FLOAT, INT
);

CREATE OR REPLACE FUNCTION public.match_rules_embeddings(
  query_embedding extensions.vector(512),
  query_game_system TEXT,
  query_campaign_id UUID DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.5,
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
    (1 - (ce.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.campaign_embeddings ce
  WHERE ce.game_system = query_game_system
    AND (ce.campaign_id IS NULL OR ce.campaign_id = query_campaign_id)
    AND (1 - (ce.embedding <=> query_embedding)) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
