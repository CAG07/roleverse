-- supabase/migrations/20260829000000_oracle_presets.sql
-- Saved Quick Oracle question presets ("clustered oracles" per the
-- solo-RPG-community thread that prompted this — a pre-built question with
-- its Likelihood already locked in, so a recurring question like "Is this
-- NPC being stealthy?" is one click instead of re-picking Likelihood every
-- time).
--
-- Freeform JSONB list, same shape/reasoning as campaigns.oracle_state
-- (20260820010000_oracle_solo_play.sql): a short, owner-edited settings
-- list, never branched on server-side beyond passthrough, so no per-row
-- table/RLS/indexing is warranted the way it is for npcs or
-- campaign_locations.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS oracle_presets JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.campaigns.oracle_presets IS
  'Saved Quick Oracle question presets: [{ id, label, likelihood }]. Likelihood is one of builtin-oracle.ts''s Likelihood values. Edited only via OraclePanel.tsx; never branched on server-side.';
