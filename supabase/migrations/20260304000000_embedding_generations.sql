-- supabase/migrations/20260304000000_embedding_generations.sql
-- Adds a generation column to support zero-downtime re-ingestion.
-- During ingestion, new chunks are written under generation N+1 while
-- generation N remains live. Old generation is deleted only after the
-- new one is fully written.

ALTER TABLE public.campaign_embeddings
  ADD COLUMN IF NOT EXISTS generation INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS campaign_embeddings_generation_idx
  ON public.campaign_embeddings(game_system, generation);