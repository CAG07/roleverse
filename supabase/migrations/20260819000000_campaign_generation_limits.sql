-- AI "Generate Premade Character/NPC" call-rate limiting.
--
-- Guards Anthropic API cost/abuse on the one-shot character/NPC generation
-- routes (app/api/campaigns/[id]/characters/generate,
-- app/api/campaigns/[id]/npcs/generate) with a simple per-campaign lifetime
-- cap on generation CALLS, not on how many generated characters/NPCs end up
-- saved (saved records are indistinguishable from manually-created ones —
-- no source tracking was added for this, by design, per product decision).
--
-- Two plain counters rather than a log table: nothing needs the individual
-- call history, only "how many so far" checked atomically against a cap in
-- the API route via `UPDATE ... SET x = x + 1 WHERE x < cap RETURNING x`.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS character_generation_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS npc_generation_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.campaigns.character_generation_count IS
  'Lifetime count of calls to the AI "Generate Premade Character" endpoint for this campaign. Capped at MAX_PREMADE_GENERATIONS (lib/character/generate-premade.ts) in app/api/campaigns/[id]/characters/generate/route.ts.';
COMMENT ON COLUMN public.campaigns.npc_generation_count IS
  'Lifetime count of calls to the AI "Generate Premade NPC" endpoint for this campaign. Capped at MAX_PREMADE_GENERATIONS (lib/character/generate-premade.ts) in app/api/campaigns/[id]/npcs/generate/route.ts.';
