-- supabase/migrations/20260808000000_match_campaign_priority_embeddings.sql
-- Guaranteed, non-competing retrieval for campaign-specific "override" content
-- (uploaded modules today; a house-rules doc would use the same path, since
-- both are ingested as source_type = 'user_pdf' — no dedicated house-rules
-- editor was built, uploading a house-rules file gets the same treatment).
--
-- match_rules_embeddings unions baseline (campaign_id IS NULL) and campaign
-- rows into ONE ranked pool — a campaign-specific chunk can lose its slot to
-- an unrelated but higher-scoring baseline chunk. This function is
-- deliberately separate rather than a parameter on that one, so campaign
-- content the player uploaded can never be crowded out: it only ever competes
-- against other rows from the SAME campaign.
--
-- Used by both the Game Master (module content grounds narration) and the
-- Rules Arbiter (uploaded content overrides baseline SRD when they conflict).
-- source_types is an array so future source_type values need no new function.

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
  WHERE ce.campaign_id = query_campaign_id
    AND ce.source_type = ANY(source_types)
    AND (1 - (ce.embedding operator(extensions.<=>) query_embedding)) > match_threshold
  ORDER BY ce.embedding operator(extensions.<=>) query_embedding
  LIMIT match_count;
END;
$$;
