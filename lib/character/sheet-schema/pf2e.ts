import type { SystemSheetSchema } from './types';

// Mirrors the mechanical content of the official Paizo PF2E character sheet
// (AC, Perception, saves, Class DC, Hero Points, the 17-skill list including
// open-ended Lore, resistances/weaknesses, speed, focus points) — not its
// printed layout or artwork.
const schema: SystemSheetSchema = {
  gameSystem: 'PATHFINDER_2E',
  fields: [
    { key: 'ac', label: 'AC', column: 'combat', kind: 'number', keyStat: true },
    { key: 'perception', label: 'Perception', column: 'combat', kind: 'number', keyStat: true },
    { key: 'classDC', label: 'Class DC', column: 'combat', kind: 'number' },
    { key: 'heroPoints', label: 'Hero Points', column: 'combat', kind: 'number', keyStat: true },
    { key: 'speed', label: 'Speed', column: 'combat', kind: 'string' },
    { key: 'experiencePoints', label: 'Experience Points', column: 'stats', kind: 'number' },
    {
      key: 'savingThrows',
      label: 'Saving Throws',
      column: 'saves',
      kind: 'record-fixed',
      keys: ['fortitude', 'reflex', 'will'],
      labels: { fortitude: 'Fortitude', reflex: 'Reflex', will: 'Will' },
    },
    { key: 'proficiencyRanks', label: 'Proficiency Ranks', column: 'skills', kind: 'record-open' },
    {
      // Official 17-skill list uses open records rather than a fixed keyset
      // because Lore is instanced per character (e.g. "Lore: Sailing",
      // "Lore: Nobility") — a fixed slot can't represent that faithfully.
      key: 'skills',
      label: 'Skills',
      column: 'skills',
      kind: 'record-open',
    },
    {
      key: 'resistancesWeaknesses',
      label: 'Resistances & Weaknesses',
      column: 'combat',
      kind: 'record-open',
    },
    { key: 'feats', label: 'Feats & Abilities', column: 'stats', kind: 'string-list' },
    { key: 'focusPoints', label: 'Focus Points', column: 'combat', kind: 'number' },
    { key: 'focusSpells', label: 'Focus Spells', column: 'stats', kind: 'string-list' },
    {
      key: 'spellSlots',
      label: 'Spell Slots',
      column: 'combat',
      kind: 'spell-slots',
      levels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    },
  ],
};

export default schema;
