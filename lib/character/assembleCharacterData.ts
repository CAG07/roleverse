import type { AssembledCharacterData, Feature, CustomField } from '@/lib/types/character';

interface CharacterRow {
  name: string;
  race?: string | null;
  class?: string | null;
  level?: number | null;
  hp?: number | null;
  max_hp?: number | null;
  game_data_stats?: Record<string, unknown> | null;
  game_data_combat?: Record<string, unknown> | null;
  game_data_saves?: Record<string, unknown> | null;
  game_data_skills?: Record<string, unknown> | null;
  game_data_abilities?: unknown[] | null;
  game_data_custom?: unknown[] | null;
  spells?: Record<string, unknown> | unknown[] | null;
}

export function assembleCharacterData(row: CharacterRow): AssembledCharacterData {
  const stats = (row.game_data_stats ?? {}) as Record<string, unknown>;
  const saves = (row.game_data_saves ?? {}) as Record<string, unknown>;
  const skills = (row.game_data_skills ?? {}) as Record<string, unknown>;
  const combat = (row.game_data_combat ?? {}) as Record<string, unknown>;
  const spells = row.spells && !Array.isArray(row.spells) ? row.spells : {};

  // Legacy fallback: 5E's "Features & Traits" field used to be stored under the
  // `features` key, which silently collided with the unrelated `features:`
  // (Feature[]) property below and was renamed to `featuresTraits`. Nothing
  // under the old key was ever deleted — this just makes it visible again
  // under the new key for characters saved before the rename. Once a character
  // is re-saved, `stats.featuresTraits` is present and this fallback no longer
  // applies.
  const legacyFeaturesTraits = Array.isArray(stats.features) ? (stats.features as string[]) : undefined;

  return {
    name: row.name,
    race: row.race,
    class: row.class,
    level: row.level,
    hp: row.hp,
    maxHp: row.max_hp,
    ...stats,
    ...saves,
    ...skills,
    ...combat,
    ...spells,
    ...(stats.featuresTraits == null && legacyFeaturesTraits ? { featuresTraits: legacyFeaturesTraits } : {}),
    features: (row.game_data_abilities ?? []) as Feature[],
    customFields: (row.game_data_custom ?? []) as CustomField[],
  };
}
