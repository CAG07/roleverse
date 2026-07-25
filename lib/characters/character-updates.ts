// lib/characters/character-updates.ts
// Client-side write helpers for character sheet inline editing.
// Follows the existing convention in this codebase (EditCharacterPage, delete flows):
// direct Supabase client writes from the browser, enforced by RLS — there is no
// dedicated /api/characters route to go through.

import { createClient } from '@/lib/supabase/client';

export async function updateCharacterHp(characterId: string, hp: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('characters').update({ hp }).eq('id', characterId);
  if (error) console.error('Failed to update character HP', error);
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
