-- supabase/migrations/20261101000000_campaign_marching_order.sql
-- The party's marching order: ranks of two, front to back, as a JSON array of
-- ranks of character ids, e.g. [["<id>", "<id>"], ["<id>", null]]. Set by
-- dragging the Party Status boxes during a session and shown to the Game
-- Master every turn (lib/characters/marching-order.ts). Null until the player
-- first rearranges it; the app then fills ranks in name order.
-- Additive and nullable; the existing "Users can update own campaigns" policy
-- covers writes.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS marching_order JSONB;
