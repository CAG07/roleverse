-- supabase/migrations/20260305000000_generation_swap.sql
-- True zero-downtime generation swap for baseline embeddings.
--
-- The `embedding_generations` table tracks which generation is "live" for each
-- (game_system, source_type) pair. During ingestion, new chunks are written
-- under `latest_generation + 1` while queries continue to hit `active_generation`.
-- On successful completion, `active_generation` flips atomically.

CREATE TABLE IF NOT EXISTS public.embedding_generations (
  game_system TEXT NOT NULL,
  source_type TEXT NOT NULL,
  active_generation INTEGER NOT NULL DEFAULT 0,
  latest_generation INTEGER NOT NULL DEFAULT 0,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (game_system, source_type)
);

ALTER TABLE public.embedding_generations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view generation state (no sensitive content here,
-- it's just bookkeeping). Writes happen via service role only.
CREATE POLICY "Authenticated users can view embedding generations"
  ON public.embedding_generations FOR SELECT
  TO authenticated
  USING (true);

-- Seed state from existing data.
-- Any existing baseline rows under campaign_id IS NULL are treated as their
-- own active generation so that pre-Option-B data stays live until the next
-- successful run promotes a fresh generation over it.
INSERT INTO public.embedding_generations
  (game_system, source_type, active_generation, latest_generation, promoted_at)
SELECT
  game_system,
  source_type,
  COALESCE(MAX(generation), 0) AS active_generation,
  COALESCE(MAX(generation), 0) AS latest_generation,
  CASE WHEN MAX(generation) > 0 THEN now() ELSE NULL END AS promoted_at
FROM public.campaign_embeddings
WHERE campaign_id IS NULL
  AND source_type = 'baseline'
GROUP BY game_system, source_type
ON CONFLICT (game_system, source_type) DO NOTHING;

-- Atomic generation reservation: increments latest_generation and returns it.
-- Creates the row with defaults if the (game_system, source_type) pair is new.
CREATE OR REPLACE FUNCTION public.reserve_next_generation(
  p_game_system TEXT,
  p_source_type TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  v_new_generation INTEGER;
BEGIN
  INSERT INTO public.embedding_generations
    (game_system, source_type, active_generation, latest_generation)
  VALUES
    (p_game_system, p_source_type, 0, 1)
  ON CONFLICT (game_system, source_type) DO UPDATE
    SET latest_generation = embedding_generations.latest_generation + 1,
        updated_at = now()
  RETURNING latest_generation INTO v_new_generation;

  RETURN v_new_generation;
END;
$$;

-- Atomic promotion: flip active_generation to the given value.
CREATE OR REPLACE FUNCTION public.promote_generation(
  p_game_system TEXT,
  p_source_type TEXT,
  p_generation INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.embedding_generations
  SET active_generation = p_generation,
      promoted_at = now(),
      updated_at = now()
  WHERE game_system = p_game_system
    AND source_type = p_source_type;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No embedding_generations row for (%, %)',
      p_game_system, p_source_type;
  END IF;
END;
$$;

-- Replace match_rules_embeddings to filter baseline rows by active_generation.
-- Campaign-scoped rows (non-null campaign_id) are not affected by generations
-- because they represent user content, not baseline ingestion.

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
  LEFT JOIN public.embedding_generations eg
    ON eg.game_system = ce.game_system
    AND eg.source_type = ce.source_type
  WHERE ce.game_system = query_game_system
    AND (ce.campaign_id IS NULL OR ce.campaign_id = query_campaign_id)
    -- Baseline rows: must match the active generation.
    -- Campaign-scoped rows: generation filter does not apply.
    AND (
      ce.campaign_id IS NOT NULL
      OR (eg.active_generation IS NOT NULL AND ce.generation = eg.active_generation)
    )
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Index to speed up the JOIN + generation filter
CREATE INDEX IF NOT EXISTS campaign_embeddings_system_source_gen_idx
  ON public.campaign_embeddings(game_system, source_type, generation)
  WHERE campaign_id IS NULL;
