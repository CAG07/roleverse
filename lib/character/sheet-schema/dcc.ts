import type { SystemSheetSchema } from './types';

// Occupation, luckySign, alignment, currentLuck, startingLuck, mercurialMagic, and weapons
// are deliberately NOT schema fields — they keep the bespoke inputs/display DCCFields.tsx
// and DCCSheet.tsx already have (alignment is a 3-way select, Luck is dual ability-score-
// and-resource with its own live editor, mercurialMagic/weapons are structured lists).
const schema: SystemSheetSchema = {
  gameSystem: 'DCC',
  fields: [
    { key: 'ac', label: 'AC', column: 'combat', kind: 'number' },
    { key: 'deedDie', label: 'Deed Die (Warriors / Dwarves)', column: 'combat', kind: 'string' },
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
      key: 'savingThrows',
      label: 'Saving Throws',
      column: 'saves',
      kind: 'record-fixed',
      keys: ['fortitude', 'reflex', 'willpower'],
      labels: { fortitude: 'Fortitude', reflex: 'Reflex', willpower: 'Willpower' },
    },
  ],
};

export default schema;
