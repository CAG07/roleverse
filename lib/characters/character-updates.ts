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

const KEY_UPDATE_ATTEMPTS = 4;

/**
 * Set one key inside a JSONB column without clobbering the column's other keys.
 * Reads the column fresh, then writes only if the row's `updated_at` (bumped by the
 * update_characters_updated_at trigger on every write) is unchanged since that read;
 * if another write landed in between, re-reads and tries again. Throws on failure.
 */
export async function updateCharacterGameDataKey(
  characterId: string,
  column: GameDataColumn,
  key: string,
  value: unknown
): Promise<void> {
  const supabase = createClient();
  for (let attempt = 0; attempt < KEY_UPDATE_ATTEMPTS; attempt++) {
    const { data, error: readError } = await supabase
      .from('characters')
      .select(`${column}, updated_at`)
      .eq('id', characterId)
      .single();
    if (readError) {
      console.error(`Failed to read character ${column}`, readError);
      throw readError;
    }
    const row = data as Record<string, unknown> | null;
    const current = (row?.[column] as Record<string, unknown> | null) ?? {};
    const readAt = row?.updated_at as string | null | undefined;

    let update = supabase
      .from('characters')
      .update({ [column]: { ...current, [key]: value } })
      .eq('id', characterId);
    update = readAt ? update.eq('updated_at', readAt) : update.is('updated_at', null);
    const { data: written, error } = await update.select('id');
    if (error) {
      console.error(`Failed to update character ${column}.${key}`, error);
      throw error;
    }
    if (written && written.length > 0) return;
    // Zero rows: the row changed after our read — loop to re-read and re-apply.
  }
  const conflict = new Error(`Character ${column}.${key} kept changing during the save; gave up after retries.`);
  console.error(conflict);
  throw conflict;
}
