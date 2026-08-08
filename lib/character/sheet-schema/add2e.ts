import type { SystemSheetSchema } from './types';

// Mirrors the mechanical content of the official TSR AD&D 2E character record
// sheet (THAC0, the 5-category saves, weapon/non-weapon proficiencies, ability
// score sub-modifiers, thief skills, class abilities, movement/attacks/XP) —
// not its printed layout or artwork.
const schema: SystemSheetSchema = {
  gameSystem: 'ADD2E',
  fields: [
    { key: 'thac0', label: 'THAC0', column: 'combat', kind: 'number', keyStat: true },
    { key: 'ac', label: 'AC', column: 'combat', kind: 'number', keyStat: true },
    { key: 'movementRate', label: 'Movement Rate', column: 'combat', kind: 'string' },
    { key: 'numberOfAttacks', label: '# of Attacks', column: 'combat', kind: 'string' },
    { key: 'experiencePoints', label: 'Experience Points', column: 'stats', kind: 'number' },
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
      // Derived combat/utility sub-modifiers the official sheet prints per ability
      // score (Str: hit/damage/weight allowance/open doors/bend bars; Dex: reaction/
      // missile/AC adjustment; Con: HP adjustment/system shock; etc.) — open-ended
      // since which ones matter varies by character (e.g. exceptional Strength % only
      // applies to 18 Strength fighters).
      key: 'abilityModifiers',
      label: 'Ability Score Modifiers',
      column: 'stats',
      kind: 'record-open',
    },
    {
      // Class abilities: Paladin's lay on hands, Ranger's tracking, Bard's legend
      // lore, etc. — nothing else on the sheet captured these before.
      key: 'classAbilities',
      label: 'Class & Racial Abilities',
      column: 'stats',
      kind: 'string-list',
    },
    {
      // Percentile skill list for Thief-type characters (and Bards, who share the
      // base list at a lower rate) — only populated when the character has them.
      key: 'thiefSkills',
      label: 'Thief Skills (%)',
      column: 'skills',
      kind: 'record-open',
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
