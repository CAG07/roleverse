-- ============================================================================
-- 002: Security Hardening Migration
-- Fixes existing security vulnerabilities BEFORE adding new tables.
-- ============================================================================

-- Move pgvector to dedicated extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

ALTER EXTENSION vector SET SCHEMA extensions;

-- ============================================================================
-- Fix mutable search paths on existing functions
-- ============================================================================

-- 1. update_updated_at_column — no extension usage, search_path = ''
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. sync_character_game_system — no extension usage, search_path = ''
CREATE OR REPLACE FUNCTION public.sync_character_game_system()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Get campaign's game system
  SELECT c.game_system INTO NEW.game_system
  FROM public.campaigns c
  WHERE c.id = NEW.campaign_id;

  -- If campaign not found, raise error
  IF NEW.game_system IS NULL THEN
    RAISE EXCEPTION 'Campaign not found: %', NEW.campaign_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. match_campaign_embeddings — needs extensions schema for vector operations
CREATE OR REPLACE FUNCTION public.match_campaign_embeddings(
  query_embedding extensions.vector(1536),
  query_campaign_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE SQL STABLE
SET search_path = 'public, extensions'
AS $$
  SELECT
    ce.id,
    ce.content,
    ce.metadata,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM public.campaign_embeddings ce
  WHERE ce.campaign_id = query_campaign_id
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
