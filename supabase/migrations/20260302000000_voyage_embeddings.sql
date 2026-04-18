-- Switch vector dimension from 1536 (OpenAI text-embedding-3-small)
-- to 1024 (Voyage voyage-3-lite).
-- Table is currently empty so no data migration needed.

-- Drop the existing HNSW index first (it's dimension-specific)
DROP INDEX IF EXISTS campaign_embeddings_vector_idx;

-- Alter the column dimension
ALTER TABLE public.campaign_embeddings
  ALTER COLUMN embedding TYPE extensions.vector(1024);

-- Recreate the HNSW index for the new dimension
CREATE INDEX campaign_embeddings_vector_idx
  ON public.campaign_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops);

-- Update the match function to use the new dimension
DROP FUNCTION IF EXISTS public.match_rules_embeddings(
  extensions.vector, TEXT, UUID, FLOAT, INT
);

CREATE OR REPLACE FUNCTION public.match_rules_embeddings(
  query_embedding extensions.vector(1024),
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
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
