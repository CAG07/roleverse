import type { AssembledCharacterData, Feature, CustomField } from '@/lib/types/character';

interface CharacterRow {
  name: string;
  race: string | null;
  class: string | null;
  level: number | null;
  hp: number | null;
  max_hp: number | null;
  game_data_stats: Record<string, unknown> | null;
  game_data_combat: Record<string, unknown> | null;
  game_data_saves: Record<string, unknown> | null;
  game_data_skills: Record<string, unknown> | null;
  game_data_abilities: unknown[] | null;
  game_data_custom: unknown[] | null;
  spells: Record<string, unknown> | unknown[] | null;
}

export function assembleCharacterData(row: CharacterRow): AssembledCharacterData {
  const combat = (row.game_data_combat ?? {}) as Record<string, unknown>;
  const spells = row.spells && !Array.isArray(row.spells) ? row.spells : {};

  return {
    name: row.name,
    race: row.race,
    class: row.class,
    level: row.level,
    hp: row.hp,
    maxHp: row.max_hp,
    abilityScores: (row.game_data_stats ?? {}) as Record<string, number>,
    savingThrows: (row.game_data_saves ?? {}) as Record<string, number | string>,
    skills: (row.game_data_skills ?? {}) as Record<string, unknown>,
    ...combat,
    ...spells,
    features: (row.game_data_abilities ?? []) as Feature[],
    customFields: (row.game_data_custom ?? []) as CustomField[],
  };
}
