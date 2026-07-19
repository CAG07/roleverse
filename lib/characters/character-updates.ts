// lib/characters/character-updates.ts
// Client-side write helpers for character sheet inline editing.
// Follows the existing convention in this codebase (EditCharacterPage, delete flows):
// direct Supabase client writes from the browser, enforced by RLS — there is no
// dedicated /api/characters route to go through.

import { createClient } from '@/lib/supabase/client';

export async function updateCharacterHp(characterId: string, hp: number): Promise<void> {
  const supabase = createClient();
  await supabase.from('characters').update({ hp }).eq('id', characterId);
}

/** Overwrite the full game_data_stats JSONB blob (caller must merge in existing keys). */
export async function updateCharacterGameDataStats(
  characterId: string,
  gameDataStats: Record<string, unknown>
): Promise<void> {
  const supabase = createClient();
  await supabase.from('characters').update({ game_data_stats: gameDataStats }).eq('id', characterId);
}
