import type { SystemSheetSchema } from './types';

const schema: SystemSheetSchema = {
  gameSystem: 'ADD2E',
  fields: [
    { key: 'thac0', label: 'THAC0', column: 'combat', kind: 'number' },
    { key: 'ac', label: 'AC', column: 'combat', kind: 'number' },
    {
      key: 'savingThrows',
      label: 'Saving Throws',
      column: 'saves',
      kind: 'record-fixed',
      keys: ['paralyzation', 'rod', 'petrification', 'breath', 'spell'],
      labels: {
        paralyzation: 'Para/Poison/Death',
        rod: 'Rod/Staff/Wand',
        petrification: 'Petrif./Polymorph',
        breath: 'Breath Weapon',
        spell: 'Spell',
      },
    },
    {
      key: 'weaponProficiencies',
      label: 'Weapon Proficiencies',
      column: 'combat',
      kind: 'string-list',
    },
    {
      key: 'nonWeaponProficiencies',
      label: 'Non-Weapon Proficiencies',
      column: 'combat',
      kind: 'string-list',
    },
    {
      key: 'spellSlots',
      label: 'Spell Slots',
      column: 'combat',
      kind: 'spell-slots',
      levels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    },
  ],
};

export default schema;
