import type { SystemSheetSchema } from './types';

// Mirrors the mechanical content of the official Paizo PF2E Remaster character
// sheet (AC, Perception, saves, Class DC, Hero Points, the 17-skill list including
// open-ended Lore, resistances/weaknesses, speed, focus points, strikes, spell
// statistics, and the origin/personality/campaign-notes pages) — not its printed
// layout or artwork.
//
// Deliberately NOT modeled (low value relative to the added complexity, or
// belongs to a different subsystem):
//   - The per-level (1-20) Ancestry/Skill/General/Class feat progression table —
//     `feats` below (a flat list) already captures this; a fixed 20-row/4-column
//     table would be a lot of schema surface for something a free-text list
//     already covers reasonably.
//   - Ability score "Partial Boost" checkboxes — a character-BUILDING aid, not
//     something referenced during play.
//   - Inventory Bulk/Price/Invested tracking — equipment already has its own
//     generic (non-schema) `equipment` prop/EquipmentList component; item-level
//     Bulk belongs there, not duplicated into the schema.
//   - Character Sketch — an image, no field kind supports that.
//   - Printed reference text (action-icon legend, proficiency-rank formulas,
//     Bulk formulas) — not character data at all.
const schema: SystemSheetSchema = {
  gameSystem: 'PATHFINDER_2E',
  fields: [
    { key: 'ac', label: 'AC', column: 'combat', kind: 'number', keyStat: true, icon: 'shield' },
    { key: 'perception', label: 'Perception', column: 'combat', kind: 'number', keyStat: true },
    { key: 'classDC', label: 'Class DC', column: 'combat', kind: 'number' },
    { key: 'heroPoints', label: 'Hero Points', column: 'combat', kind: 'number', keyStat: true },
    { key: 'speed', label: 'Speed', column: 'combat', kind: 'string' },
    { key: 'size', label: 'Size', column: 'stats', kind: 'string' },
    { key: 'senses', label: 'Senses', column: 'stats', kind: 'string' },
    { key: 'experiencePoints', label: 'Experience Points', column: 'stats', kind: 'number' },
    { key: 'alignment', label: 'Alignment', column: 'stats', kind: 'string' },
    { key: 'playersName', label: "Player's Name", column: 'stats', kind: 'string' },
    { key: 'background', label: 'Background', column: 'stats', kind: 'string' },
    { key: 'heritageTraits', label: 'Heritage and Traits', column: 'stats', kind: 'string' },
    { key: 'classNotes', label: 'Class Notes', column: 'stats', kind: 'text' },
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
    {
      // Active condition -> value/rank (e.g. "Frightened" -> 2, "Sickened" -> 1).
      key: 'conditions',
      label: 'Conditions',
      column: 'combat',
      kind: 'record-open',
    },
    { key: 'temporaryHp', label: 'Temporary HP', column: 'combat', kind: 'number' },
    { key: 'dying', label: 'Dying', column: 'combat', kind: 'number' },
    { key: 'wounded', label: 'Wounded', column: 'combat', kind: 'number' },
    {
      key: 'acBreakdown',
      label: 'Armor Class Breakdown',
      column: 'combat',
      kind: 'record-fixed',
      keys: ['base', 'dex', 'prof', 'item'],
      labels: { base: 'Base', dex: 'Dexterity', prof: 'Proficiency', item: 'Item' },
    },
    {
      key: 'shield',
      label: 'Shield',
      column: 'combat',
      kind: 'record-fixed',
      keys: ['hardness', 'maxHp', 'brokenThreshold', 'hp'],
      labels: { hardness: 'Hardness', maxHp: 'Max HP', brokenThreshold: 'Broken Threshold', hp: 'Current HP' },
    },
    {
      key: 'strikes',
      label: 'Strikes',
      column: 'combat',
      kind: 'table',
      columns: [
        { key: 'weapon', label: 'Weapon', type: 'text' },
        { key: 'type', label: 'Melee / Ranged', type: 'text' },
        { key: 'attackBonus', label: 'Attack Bonus', type: 'text' },
        { key: 'damage', label: 'Damage', type: 'text' },
        { key: 'traits', label: 'Traits', type: 'text' },
      ],
    },
    { key: 'languages', label: 'Languages', column: 'skills', kind: 'string-list' },
    { key: 'feats', label: 'Feats & Abilities', column: 'stats', kind: 'string-list' },
    {
      key: 'currency',
      label: 'Currency',
      column: 'stats',
      kind: 'record-fixed',
      keys: ['cp', 'sp', 'gp', 'pp'],
      labels: { cp: 'Copper', sp: 'Silver', gp: 'Gold', pp: 'Platinum' },
    },
    { key: 'magicalTradition', label: 'Magical Tradition', column: 'stats', kind: 'string' },
    { key: 'casterType', label: 'Caster Type', column: 'stats', kind: 'string' },
    { key: 'spellAttack', label: 'Spell Attack', column: 'combat', kind: 'number' },
    { key: 'spellDC', label: 'Spell DC', column: 'combat', kind: 'number' },
    { key: 'cantripsPerDay', label: 'Cantrips per Day', column: 'combat', kind: 'number' },
    { key: 'cantripRank', label: 'Cantrip Rank', column: 'combat', kind: 'number' },
    { key: 'focusPoints', label: 'Focus Points', column: 'combat', kind: 'number' },
    { key: 'focusSpellRank', label: 'Focus Spell Rank', column: 'combat', kind: 'number' },
    { key: 'focusSpells', label: 'Focus Spells', column: 'stats', kind: 'string-list' },
    {
      key: 'spellSlots',
      label: 'Spell Slots',
      column: 'combat',
      kind: 'spell-slots',
      levels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    },
    {
      // Covers the sheet's Cantrips/Spells/Focus Spells/Innate Spells/Rituals
      // lists in one flexible table — `rank` 0 for cantrips, `type` distinguishes
      // category, `cost` only meaningful for rituals. Mirrors the same modeling
      // choice made for 5E's knownSpells field.
      key: 'knownSpells',
      label: 'Known Spells',
      column: 'combat',
      kind: 'table',
      columns: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'rank', label: 'Rank', type: 'number' },
        { key: 'type', label: 'Type', type: 'text' },
        { key: 'prepared', label: 'Prepared', type: 'text' },
        { key: 'cost', label: 'Cost (Rituals)', type: 'text' },
      ],
    },
    {
      // Covers the sheet's "Actions and Activities" and "Free Actions and
      // Reactions" boxes in one table — `trigger` only meaningful for reactions.
      key: 'specialActions',
      label: 'Special Actions & Reactions',
      column: 'stats',
      kind: 'table',
      columns: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'trigger', label: 'Trigger', type: 'text' },
        { key: 'traits', label: 'Traits', type: 'text' },
        { key: 'effects', label: 'Effects', type: 'text' },
      ],
    },
    { key: 'ethnicity', label: 'Ethnicity', column: 'stats', kind: 'string' },
    { key: 'nationality', label: 'Nationality', column: 'stats', kind: 'string' },
    { key: 'birthplace', label: 'Birthplace', column: 'stats', kind: 'string' },
    { key: 'age', label: 'Age', column: 'stats', kind: 'string' },
    { key: 'genderPronouns', label: 'Gender & Pronouns', column: 'stats', kind: 'string' },
    { key: 'height', label: 'Height', column: 'stats', kind: 'string' },
    { key: 'weight', label: 'Weight', column: 'stats', kind: 'string' },
    { key: 'appearance', label: 'Appearance', column: 'stats', kind: 'text' },
    { key: 'attitude', label: 'Attitude', column: 'stats', kind: 'string' },
    { key: 'deityOrPhilosophy', label: 'Deity or Philosophy', column: 'stats', kind: 'string' },
    { key: 'edicts', label: 'Edicts', column: 'stats', kind: 'text' },
    { key: 'anathema', label: 'Anathema', column: 'stats', kind: 'text' },
    { key: 'likes', label: 'Likes', column: 'stats', kind: 'text' },
    { key: 'dislikes', label: 'Dislikes', column: 'stats', kind: 'text' },
    { key: 'catchphrases', label: 'Catchphrases', column: 'stats', kind: 'text' },
    { key: 'campaignNotes', label: 'Campaign Notes', column: 'stats', kind: 'text' },
    { key: 'allies', label: 'Allies', column: 'stats', kind: 'text' },
    { key: 'enemies', label: 'Enemies', column: 'stats', kind: 'text' },
    { key: 'organizations', label: 'Organizations', column: 'stats', kind: 'text' },
  ],
};

export default schema;
