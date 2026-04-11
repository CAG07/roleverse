-- Phase 6a: RAG Pipeline + Rules Arbiter
-- Drops strict NOT NULL constraints on campaign_embeddings so the service role can
-- insert system-wide baseline rules rows (campaign_id IS NULL, user_id IS NULL).
-- Adds an ingestion_jobs progress table and a new match function scoped by game system.

-- ============================================================================
-- CAMPAIGN EMBEDDINGS — schema adjustments
-- ============================================================================

-- Make campaign_id and user_id nullable.
-- NULL campaign_id = base system rules shared across all campaigns of that game_system.
-- NULL user_id     = system-ingested content (not user-uploaded).
ALTER TABLE public.campaign_embeddings
  ALTER COLUMN campaign_id DROP NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL;

-- Add a source_type column for distinguishing baseline content from future user content.
ALTER TABLE public.campaign_embeddings
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'baseline'
    CHECK (source_type IN ('baseline', 'house_rule', 'user_pdf', 'user_notes'));

CREATE INDEX IF NOT EXISTS campaign_embeddings_game_system_idx
  ON public.campaign_embeddings(game_system);

CREATE INDEX IF NOT EXISTS campaign_embeddings_source_type_idx
  ON public.campaign_embeddings(source_type);

-- ============================================================================
-- RLS — campaign_embeddings
-- ============================================================================

-- UPDATE: authenticated users can read baseline content for any system,
-- and their own campaign-scoped content as before.
DROP POLICY IF EXISTS "Users can view own embeddings" ON public.campaign_embeddings;
CREATE POLICY "Users can view embeddings"
  ON public.campaign_embeddings FOR SELECT
  USING (
    -- Anyone authenticated can read baseline rules
    (campaign_id IS NULL AND source_type = 'baseline')
    -- Or their own campaign-scoped content
    OR auth.uid() = user_id
    -- Or content for a campaign they own
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_embeddings.campaign_id
        AND c.owner_id = auth.uid()
    )
  );

-- INSERT policy: only service role can insert baseline rows (campaign_id IS NULL).
-- Regular users can still insert their own scoped rows for future house-rules feature.
DROP POLICY IF EXISTS "Users can create own embeddings" ON public.campaign_embeddings;
CREATE POLICY "Users can create embeddings"
  ON public.campaign_embeddings FOR INSERT
  WITH CHECK (
    -- Campaign-scoped content: user must own the row
    (campaign_id IS NOT NULL AND auth.uid() = user_id)
  );

-- ============================================================================
-- INGESTION JOBS — progress polling table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_system TEXT NOT NULL,
  source_label TEXT NOT NULL,           -- e.g. 'open5e', 'osric', 'pf2e-foundry'
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_chunks INTEGER DEFAULT 0,
  processed_chunks INTEGER DEFAULT 0,
  error_message TEXT,
  started_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;

-- Only the admin (started_by) can read their own jobs.
-- Service role bypasses RLS for actual ingestion writes.
CREATE POLICY "Admin can view own ingestion jobs"
  ON public.ingestion_jobs FOR SELECT
  USING (auth.uid() = started_by);

CREATE INDEX IF NOT EXISTS ingestion_jobs_game_system_idx
  ON public.ingestion_jobs(game_system);

CREATE INDEX IF NOT EXISTS ingestion_jobs_status_idx
  ON public.ingestion_jobs(status);

-- ============================================================================
-- match_rules_embeddings — replaces match_campaign_embeddings
-- Returns rows matching game_system AND (campaign_id IS NULL OR = $query_campaign_id)
-- Threshold lowered from 0.7 → 0.5: short queries against rule text need a wider net.
-- ============================================================================

DROP FUNCTION IF EXISTS public.match_campaign_embeddings(vector(1536), uuid, float, int);

CREATE OR REPLACE FUNCTION public.match_rules_embeddings(
  query_embedding vector(1536),
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
-- 'extensions' is required because pgvector's <=> operator lives in that schema.
-- This is the standard pattern for Supabase projects that install pgvector under extensions.
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
