// lib/characters/character-updates.ts
// Client-side write helpers for character sheet inline editing.
// Follows the existing convention in this codebase (EditCharacterPage, delete flows):
// direct Supabase client writes from the browser, enforced by RLS — there is no
// dedicated /api/characters route to go through.

import { createClient } from '@/lib/supabase/client';

/** Throws on failure so callers that need to know (e.g. a confirm/retry UI) can
 *  react — fire-and-forget callers that don't care should still catch it themselves. */
export async function updateCharacterHp(characterId: string, hp: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('characters').update({ hp }).eq('id', characterId);
  if (error) {
    console.error('Failed to update character HP', error);
    throw error;
  }
}

export type GameDataColumn =
  | 'game_data_stats'
  | 'game_data_combat'
  | 'game_data_saves'
  | 'game_data_skills'
  | 'game_data_custom';

/** Overwrite one flexible JSONB column (caller must merge in existing keys). */
export async function updateCharacterGameDataColumn(
  characterId: string,
  column: GameDataColumn,
  value: unknown
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('characters').update({ [column]: value }).eq('id', characterId);
  if (error) console.error(`Failed to update character ${column}`, error);
}

/** Set one key inside a JSONB column, reading the column fresh first so other keys
 *  aren't overwritten from stale client state. Throws on failure. */
export async function updateCharacterGameDataKey(
  characterId: string,
  column: GameDataColumn,
  key: string,
  value: unknown
): Promise<void> {
  const supabase = createClient();
  const { data, error: readError } = await supabase.from('characters').select(column).eq('id', characterId).single();
  if (readError) {
    console.error(`Failed to read character ${column}`, readError);
    throw readError;
  }
  const current = ((data as Record<string, unknown> | null)?.[column] as Record<string, unknown> | null) ?? {};
  const { error } = await supabase
    .from('characters')
    .update({ [column]: { ...current, [key]: value } })
    .eq('id', characterId);
  if (error) {
    console.error(`Failed to update character ${column}.${key}`, error);
    throw error;
  }
}
