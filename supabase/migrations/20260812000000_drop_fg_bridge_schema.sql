-- supabase/migrations/20260812000000_drop_fg_bridge_schema.sql
-- Drops the unused Fantasy Grounds live-sync schema. Confirmed via full-repo
-- grep that zero application code reads or writes any of it — the FG bridge
-- described in the original schema comments was never built into this app
-- (a separate FG sync client exists outside this repo). The project has
-- decided against a live FG<->RoleVerse sync going forward: RoleVerse (or manual
-- player tracking) stays the source of truth, and any future Fantasy Grounds
-- interop will be a one-way character-sheet export, not a bidirectional
-- bridge — so this schema has no future use to preserve.

-- Whole table, never referenced by any route/agent/component.
DROP TABLE IF EXISTS public.fg_commands;

-- campaigns: FG-linkage + import-source tracking, never written.
ALTER TABLE public.campaigns
  DROP COLUMN IF EXISTS fg_campaign_id,
  DROP COLUMN IF EXISTS fg_ruleset,
  DROP COLUMN IF EXISTS source;

-- characters: FG-linkage + last-synced tracking, never written.
-- characters_fg_id_idx is defined on fg_character_id and is dropped
-- automatically along with the column.
ALTER TABLE public.characters
  DROP COLUMN IF EXISTS fg_character_id,
  DROP COLUMN IF EXISTS fg_raw_data,
  DROP COLUMN IF EXISTS last_synced_at;
