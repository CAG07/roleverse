import type { SheetField, SystemSheetSchema } from './types';
import dnd5e from './dnd5e';

// D&D 5E (2024 revised rules). Derived from the 2014 schema rather than
// duplicated: the 2024 official sheet keeps the same ability scores, saves,
// 18-skill list, combat block, spellcasting and death saves, so every shared
// field keeps the same key. That keeps the 5E Fantasy Grounds export/import
// (lib/character/export/fantasy-grounds/dnd5e.ts, import/.../parse-dnd5e.ts)
// working unchanged for 2024 characters.
//
// What the 2024 sheet changes:
// - Species replaces race (the universal `race` column holds the species name).
// - The background grants the ability score increases and an Origin feat.
// - Weapon Mastery properties, a Size entry, and Exhaustion levels (1-6, each
//   level a -2 to d20 tests) are new.
// - Inspiration is "Heroic Inspiration".
// - Ideals, bonds and flaws are gone; personality is one free-form entry.
const DROPPED_KEYS = new Set(['ideals', 'bonds', 'flaws']);

const RELABELED: Record<string, string> = {
  inspiration: 'Heroic Inspiration',
  personalityTraits: 'Personality',
};

const ADDED_AFTER_BACKGROUND: SheetField[] = [
  {
    key: 'backgroundAbilityIncreases',
    label: 'Background Ability Score Increases',
    column: 'stats',
    kind: 'string',
  },
  { key: 'originFeat', label: 'Origin Feat', column: 'stats', kind: 'string' },
  { key: 'size', label: 'Size', column: 'stats', kind: 'string' },
];

const ADDED_AFTER_DEATH_SAVES: SheetField[] = [
  { key: 'exhaustion', label: 'Exhaustion Level', column: 'combat', kind: 'number' },
];

const ADDED_AFTER_EQUIPMENT_PROFICIENCIES: SheetField[] = [
  { key: 'weaponMasteries', label: 'Weapon Masteries', column: 'skills', kind: 'string-list' },
  { key: 'feats', label: 'Feats', column: 'stats', kind: 'string-list' },
];

const fields: SheetField[] = [];
for (const field of dnd5e.fields) {
  if (DROPPED_KEYS.has(field.key)) continue;
  fields.push(RELABELED[field.key] ? { ...field, label: RELABELED[field.key] } : field);
  if (field.key === 'background') fields.push(...ADDED_AFTER_BACKGROUND);
  if (field.key === 'deathSaves') fields.push(...ADDED_AFTER_DEATH_SAVES);
  if (field.key === 'equipmentProficiencies') fields.push(...ADDED_AFTER_EQUIPMENT_PROFICIENCIES);
}

const schema: SystemSheetSchema = {
  gameSystem: '5E_2024',
  fields,
};

export default schema;
