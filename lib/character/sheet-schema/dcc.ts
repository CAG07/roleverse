import type { SystemSheetSchema } from './types';

// Field selection is grounded in this project's own DCC reference (data/dcc-stub.md,
// an original independently-written mechanics summary) rather than any Goodman Games
// printed sheet — DCC's official character sheet art/layout is their product identity,
// which this project deliberately avoids reproducing (see dcc-stub.md's own note on the
// same principle for named patrons). The mechanical content below (saves, thief skills,
// spellcasting, corruption, patron taint) matches what a DCC character actually tracks.
//
// Occupation, luckySign, alignment, currentLuck, startingLuck, mercurialMagic, and
// weapons are deliberately NOT schema fields — they keep the bespoke inputs/display
// DCCFields.tsx and DCCSheet.tsx already have (alignment is a 3-way select, Luck is
// dual ability-score-and-resource with its own live editor, mercurialMagic/weapons
// are structured lists).
const schema: SystemSheetSchema = {
  gameSystem: 'DCC',
  fields: [
    { key: 'ac', label: 'AC', column: 'combat', kind: 'number', keyStat: true },
    { key: 'initiative', label: 'Initiative', column: 'combat', kind: 'number' },
    { key: 'speed', label: 'Speed', column: 'combat', kind: 'string' },
    { key: 'experiencePoints', label: 'Experience Points', column: 'stats', kind: 'number' },
    { key: 'deedDie', label: 'Deed Die (Warriors / Dwarves)', column: 'combat', kind: 'string' },
    { key: 'backstab', label: 'Backstab (Thieves / Halflings)', column: 'combat', kind: 'string' },
    {
      key: 'disapprovalRange',
      label: 'Disapproval Range (Clerics)',
      column: 'combat',
      kind: 'number',
    },
    {
      key: 'corruption',
      label: 'Corruption (Wizards / Elves)',
      column: 'combat',
      kind: 'string-list',
    },
    {
      key: 'patronTaint',
      label: 'Patron Taint (Patron-Bonded Casters)',
      column: 'combat',
      kind: 'string-list',
    },
    {
      key: 'savingThrows',
      label: 'Saving Throws',
      column: 'saves',
      kind: 'record-fixed',
      keys: ['fortitude', 'reflex', 'willpower'],
      labels: { fortitude: 'Fortitude', reflex: 'Reflex', willpower: 'Willpower' },
    },
    {
      // Percentile skills for Thieves/Halflings (sneak silently, hide in shadows,
      // pick locks, pick pockets, disable traps, climb sheer surfaces, forge
      // documents, handle poison, read languages, cast spell from scroll) — open
      // record since the exact list varies by table/printing (dcc-stub.md, "Core
      // Thief Skills").
      key: 'thiefSkills',
      label: 'Thief Skills (%)',
      column: 'skills',
      kind: 'record-open',
    },
    {
      key: 'knownSpells',
      label: 'Known Spells (Wizards / Clerics / Elves)',
      column: 'stats',
      kind: 'string-list',
    },
  ],
};

export default schema;
