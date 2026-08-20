import type { SystemSheetSchema } from './types';

// Mirrors the mechanical content of the classic R. Talsorian Cyberpunk 2020
// character sheet (Humanity loss, Move Allowance, the wound-state track,
// Armor SP by hit location, the weapons table) — not its printed layout or
// artwork. Skills use record-open rather than a fixed keyset: CP2020's skill
// list runs 100+ entries across 5 stat categories and most characters only
// ever fill in a fraction of them, the same reasoning PF2E's Lore skills and
// 3.5E's Craft/Knowledge/Perform/Profession sub-types already use here.
const schema: SystemSheetSchema = {
  gameSystem: 'CYBERPUNK_2020',
  fields: [
    { key: 'realName', label: 'Real Name', column: 'stats', kind: 'string' },
    { key: 'age', label: 'Age', column: 'stats', kind: 'string' },
    { key: 'height', label: 'Height', column: 'stats', kind: 'string' },
    { key: 'weight', label: 'Weight', column: 'stats', kind: 'string' },
    { key: 'bodyType', label: 'Body Type', column: 'stats', kind: 'string' },
    { key: 'hairColor', label: 'Hair Color', column: 'stats', kind: 'string' },
    { key: 'eyeColor', label: 'Eye Color', column: 'stats', kind: 'string' },
    {
      key: 'humanity',
      label: 'Humanity',
      column: 'combat',
      kind: 'record-fixed',
      keys: ['current', 'total'],
      labels: { current: 'Current', total: 'Total' },
    },
    {
      key: 'move',
      label: 'Move',
      column: 'combat',
      kind: 'record-fixed',
      keys: ['run', 'leap', 'swim'],
      labels: { run: 'Run', leap: 'Leap', swim: 'Swim' },
    },
    { key: 'saveNumber', label: 'Save', column: 'combat', kind: 'number' },
    { key: 'initiative', label: 'Initiative', column: 'combat', kind: 'number', keyStat: true },
    { key: 'currentWounds', label: 'Current Wounds', column: 'combat', kind: 'number' },
    { key: 'woundStatus', label: 'Wound Status', column: 'combat', kind: 'string', keyStat: true },
    {
      key: 'armor',
      label: 'Armor',
      column: 'combat',
      kind: 'table',
      columns: [
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'sp', label: 'SP', type: 'number' },
        { key: 'notes', label: 'Notes', type: 'text' },
      ],
    },
    {
      key: 'weapons',
      label: 'Weapons',
      column: 'combat',
      kind: 'table',
      columns: [
        { key: 'name', label: 'Weapon', type: 'text' },
        { key: 'type', label: 'Type', type: 'text' },
        { key: 'concealability', label: 'Concealability', type: 'text' },
        { key: 'availability', label: 'Availability', type: 'text' },
        { key: 'ammo', label: 'Ammo', type: 'text' },
        { key: 'rateOfFire', label: 'ROF', type: 'text' },
        { key: 'damage', label: 'Damage', type: 'text' },
        { key: 'shots', label: 'Shots', type: 'text' },
      ],
    },
    { key: 'cyberware', label: 'Cyberware', column: 'stats', kind: 'string-list' },
    { key: 'skills', label: 'Skills', column: 'skills', kind: 'record-open' },
    { key: 'lifestyle', label: 'Lifestyle', column: 'stats', kind: 'string' },
    { key: 'eurodollars', label: 'Eurodollars', column: 'stats', kind: 'number' },
    { key: 'improvementPoints', label: 'Improvement Points', column: 'stats', kind: 'number' },
    { key: 'reputation', label: 'Reputation', column: 'stats', kind: 'number' },
    { key: 'interfaceRating', label: 'Interface Rating', column: 'combat', kind: 'number' },
    { key: 'netrunningPrograms', label: 'Netrunning Programs', column: 'stats', kind: 'string-list' },
    { key: 'friendsFamilyEnemiesLovers', label: 'Friends, Family, Enemies & Lovers', column: 'stats', kind: 'text' },
    { key: 'background', label: 'Background', column: 'stats', kind: 'text' },
  ],
};

export default schema;
