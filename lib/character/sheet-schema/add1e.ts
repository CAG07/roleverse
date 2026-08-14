import type { SystemSheetSchema } from './types';

// Mirrors the mechanical content of the official TSR AD&D 1E character record
// sheet (THAC0, the 5-category saves, weapon proficiencies, ability score
// sub-modifiers, thief skills, class abilities, movement/attacks/XP) — not its
// printed layout or artwork. Grounded in data/osric-stub.md, specifically its
// "Where 1E and 2E Diverge" section, which is why this schema differs from
// add2e.ts exactly where it does:
//   - No `nonWeaponProficiencies` field — that's a 2E-only proficiency-slot
//     system per the stub; 1E core rules have no equivalent.
//   - Weapon Speed Factor and the 1E-only weapon-vs-armor-type adjustment
//     table are per-weapon notes, not dedicated fields — they fit as free
//     text inside `weaponProficiencies` entries rather than adding low-value
//     fixed fields for a niche optional table.
const schema: SystemSheetSchema = {
  gameSystem: 'ADD1E',
  fields: [
    { key: 'thac0', label: 'THAC0', column: 'combat', kind: 'number', keyStat: true },
    { key: 'ac', label: 'AC', column: 'combat', kind: 'number', keyStat: true },
    { key: 'movementRate', label: 'Movement Rate', column: 'combat', kind: 'string' },
    { key: 'numberOfAttacks', label: '# of Attacks', column: 'combat', kind: 'string' },
    { key: 'experiencePoints', label: 'Experience Points', column: 'stats', kind: 'number' },
    { key: 'alignment', label: 'Alignment', column: 'stats', kind: 'string' },
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
      // Weapon Speed Factor and weapon-vs-armor-type adjustments (both 1E-only
      // optional rules) belong here as free-text notes per entry rather than
      // as dedicated fields — see file header.
      key: 'weaponProficiencies',
      label: 'Weapon Proficiencies',
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
      // lore, etc.
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
      key: 'languages',
      label: 'Languages',
      column: 'stats',
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
