-- Add FALLOUT_2D20 to the campaigns.game_system allow-list.
--
-- New system added to lib/game-systems/registry.ts (Fallout 2d20, Modiphius'
-- 2d20 system) — Postgres CHECK constraints can't have a single value added,
-- so this drops and recreates `valid_game_system` with the same full list
-- from 20250101000000_initial_schema.sql plus the new value, rather than
-- editing that original migration.

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS valid_game_system;

ALTER TABLE public.campaigns
  ADD CONSTRAINT valid_game_system
  CHECK (game_system IN (
    'ADD1E', 'ADD2E', '3_5E', '4E', '5E_2014', '5E_2024',
    'PATHFINDER', 'PATHFINDER_2E', 'DCC', 'TOR1E', 'TOR2E', 'CYBERPUNK_2020',
    'FALLOUT_2D20'
  ));
