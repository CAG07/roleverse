// lib/game-systems/registry.test.ts
// Guards against silent campaign-creation failures: the TS game-system ID
// union and the DB's valid_game_system CHECK constraint must always agree.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getAllGameSystemsIncludingUnsupported } from './registry';

// Most recent migration that redefines the full valid_game_system constraint
// (Postgres CHECK constraints can't append a single value — every migration
// that adds a system drops and recreates the constraint with the full list).
// If a future migration supersedes this one, update MIGRATION_PATH in the
// same PR that adds it.
const MIGRATION_PATH = path.resolve(
  import.meta.dirname,
  '../../supabase/migrations/20260820000000_add_fallout_2d20_game_system.sql'
);

describe('game system ID parity', () => {
  it('registry IDs match the DB valid_game_system CHECK constraint', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf-8');
    const match = sql.match(/CHECK \(game_system IN \(([\s\S]*?)\)\)/);
    expect(match).not.toBeNull();

    const dbIds = new Set(Array.from(match![1].matchAll(/'([A-Z0-9_]+)'/g)).map((m) => m[1]));
    const registryIds = new Set(getAllGameSystemsIncludingUnsupported().map((s) => s.id));

    expect(registryIds).toEqual(dbIds);
  });
});
