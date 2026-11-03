import { beforeEach, describe, expect, it, vi } from 'vitest';

// A tiny fake of the Supabase query builder: one `characters` row whose updated_at
// changes on every successful write, with an optional "someone else wrote" hook.
interface Row {
  game_data_combat: Record<string, unknown>;
  updated_at: string;
}
let row: Row;
let clock = 0;
let beforeWrite: (() => void) | null = null;
const updates: Record<string, unknown>[] = [];

function makeClient() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { ...row, game_data_combat: { ...row.game_data_combat } }, error: null }),
        }),
      }),
      update: (patch: Record<string, unknown>) => {
        const filters: Record<string, unknown> = {};
        const builder = {
          eq(col: string, val: unknown) {
            filters[col] = val;
            return builder;
          },
          is(col: string, val: unknown) {
            filters[col] = val;
            return builder;
          },
          async select() {
            beforeWrite?.();
            beforeWrite = null;
            if (filters.updated_at !== row.updated_at) return { data: [], error: null };
            updates.push(patch);
            row = { ...row, ...(patch as Partial<Row>), updated_at: `t${++clock}` };
            return { data: [{ id: 'c1' }], error: null };
          },
        };
        return builder;
      },
    }),
  };
}

vi.mock('@/lib/supabase/client', () => ({ createClient: () => makeClient() }));

const { updateCharacterGameDataKey } = await import('./character-updates');

beforeEach(() => {
  clock = 0;
  row = { game_data_combat: { spellbook: [], thac0: 19 }, updated_at: 't0' };
  beforeWrite = null;
  updates.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('updateCharacterGameDataKey', () => {
  it('sets one key and keeps the rest of the column', async () => {
    await updateCharacterGameDataKey('c1', 'game_data_combat', 'spellbook', [{ name: 'Sleep' }]);
    expect(row.game_data_combat).toEqual({ spellbook: [{ name: 'Sleep' }], thac0: 19 });
  });

  it('re-reads and retries when another write lands between read and write', async () => {
    beforeWrite = () => {
      row = { game_data_combat: { ...row.game_data_combat, spellSlotsExpended: { 1: 1 } }, updated_at: 'other' };
    };
    await updateCharacterGameDataKey('c1', 'game_data_combat', 'spellbook', [{ name: 'Sleep' }]);
    expect(updates).toHaveLength(1);
    expect(row.game_data_combat).toEqual({
      spellbook: [{ name: 'Sleep' }],
      thac0: 19,
      spellSlotsExpended: { 1: 1 },
    });
  });
});
