-- supabase/migrations/20260801000000_npc_reset.sql
-- B2: reset NPC roster for the transcript-derived model.
-- The app has minimal real data; clearing avoids reconciling proposal-era rows.

TRUNCATE TABLE public.npcs;

-- Add a provenance column so we know how each NPC entered the roster.
ALTER TABLE public.npcs
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
-- source values: 'manual' (CRUD), 'extracted' (from transcript), 'imported' (module/FG)

-- Track when an NPC was last refreshed from a transcript extraction.
ALTER TABLE public.npcs
  ADD COLUMN IF NOT EXISTS last_extracted_at TIMESTAMPTZ;
