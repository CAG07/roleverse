import type { SystemSheetSchema } from './types';

const schema: SystemSheetSchema = {
  gameSystem: 'PATHFINDER_2E',
  fields: [
    { key: 'ac', label: 'AC', column: 'combat', kind: 'number' },
    { key: 'perception', label: 'Perception', column: 'combat', kind: 'number' },
    {
      key: 'savingThrows',
      label: 'Saving Throws',
      column: 'saves',
      kind: 'record-fixed',
      keys: ['fortitude', 'reflex', 'will'],
      labels: { fortitude: 'Fortitude', reflex: 'Reflex', will: 'Will' },
    },
    { key: 'proficiencyRanks', label: 'Proficiency Ranks', column: 'skills', kind: 'record-open' },
    { key: 'skills', label: 'Skills', column: 'skills', kind: 'record-open' },
    { key: 'feats', label: 'Feats & Abilities', column: 'stats', kind: 'string-list' },
  ],
};

export default schema;
