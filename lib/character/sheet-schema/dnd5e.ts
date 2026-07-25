import type { SystemSheetSchema } from './types';

const schema: SystemSheetSchema = {
  gameSystem: '5E_2014',
  fields: [
    { key: 'ac', label: 'AC', column: 'combat', kind: 'number' },
    { key: 'proficiencyBonus', label: 'Proficiency Bonus', column: 'combat', kind: 'number' },
    { key: 'hitDice', label: 'Hit Dice', column: 'combat', kind: 'string' },
    {
      key: 'savingThrowProficiencies',
      label: 'Saving Throw Proficiencies',
      column: 'saves',
      kind: 'string-list',
    },
    {
      key: 'skillProficiencies',
      label: 'Skill Proficiencies',
      column: 'skills',
      kind: 'string-list',
    },
    { key: 'features', label: 'Features & Traits', column: 'stats', kind: 'string-list' },
    { key: 'spellSaveDC', label: 'Spell Save DC', column: 'combat', kind: 'number' },
    { key: 'spellAttackModifier', label: 'Spell Attack Modifier', column: 'combat', kind: 'number' },
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
