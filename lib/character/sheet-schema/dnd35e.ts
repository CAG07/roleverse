import type { SystemSheetSchema } from './types';

// Mirrors the mechanical content of the official 2003 WotC D&D 3.5E Character
// Record Sheet (ascending AC with a full breakdown, base attack bonus/grapple,
// the ranked-skill system with class-skill flag, feats, the per-level
// spells-known/save-DC/per-day/bonus-spells grid, encumbrance) — not its
// printed layout or artwork. Skills use record-open (not a fixed keyset) since
// 3.5E's Craft/Knowledge/Perform/Profession skills are player-defined
// sub-types (e.g. "Craft (Alchemy)") the same way PF2E's Lore is. Inventory
// (armor/shield/gear) stays on the existing generic `equipment` prop, not
// duplicated into the schema.
const schema: SystemSheetSchema = {
  gameSystem: '3_5E',
  fields: [
    { key: 'ac', label: 'AC', column: 'combat', kind: 'number', keyStat: true, icon: 'shield' },
    { key: 'touchAC', label: 'Touch AC', column: 'combat', kind: 'number' },
    { key: 'flatFootedAC', label: 'Flat-Footed AC', column: 'combat', kind: 'number' },
    {
      key: 'acBreakdown',
      label: 'AC Breakdown',
      column: 'combat',
      kind: 'record-fixed',
      keys: ['armorBonus', 'shieldBonus', 'dexModifier', 'sizeModifier', 'naturalArmor', 'deflectionModifier', 'miscModifier'],
      labels: {
        armorBonus: 'Armor Bonus',
        shieldBonus: 'Shield Bonus',
        dexModifier: 'Dexterity Modifier',
        sizeModifier: 'Size Modifier',
        naturalArmor: 'Natural Armor',
        deflectionModifier: 'Deflection Modifier',
        miscModifier: 'Miscellaneous',
      },
    },
    { key: 'initiative', label: 'Initiative', column: 'combat', kind: 'number', keyStat: true },
    { key: 'speed', label: 'Speed', column: 'combat', kind: 'string' },
    { key: 'baseAttackBonus', label: 'Base Attack Bonus', column: 'combat', kind: 'string', keyStat: true },
    { key: 'grappleModifier', label: 'Grapple', column: 'combat', kind: 'number' },
    { key: 'spellResistance', label: 'Spell Resistance', column: 'combat', kind: 'number' },
    { key: 'damageReduction', label: 'Damage Reduction', column: 'combat', kind: 'string' },
    { key: 'nonlethalDamage', label: 'Nonlethal Damage', column: 'combat', kind: 'number' },
    { key: 'arcaneSpellFailure', label: 'Arcane Spell Failure (%)', column: 'combat', kind: 'number' },
    {
      key: 'savingThrows',
      label: 'Saving Throws',
      column: 'saves',
      kind: 'record-fixed',
      keys: ['fortitude', 'reflex', 'will'],
      labels: { fortitude: 'Fortitude', reflex: 'Reflex', will: 'Will' },
    },
    { key: 'skills', label: 'Skills', column: 'skills', kind: 'record-open' },
    { key: 'classSkills', label: 'Class Skills', column: 'skills', kind: 'string-list' },
    { key: 'feats', label: 'Feats', column: 'stats', kind: 'string-list' },
    { key: 'specialAbilities', label: 'Special Abilities', column: 'stats', kind: 'string-list' },
    { key: 'languages', label: 'Languages', column: 'stats', kind: 'string-list' },
    { key: 'playersName', label: "Player's Name", column: 'stats', kind: 'string' },
    { key: 'campaign', label: 'Campaign', column: 'stats', kind: 'string' },
    { key: 'deity', label: 'Deity', column: 'stats', kind: 'string' },
    { key: 'size', label: 'Size', column: 'stats', kind: 'string' },
    { key: 'age', label: 'Age', column: 'stats', kind: 'string' },
    { key: 'gender', label: 'Gender', column: 'stats', kind: 'string' },
    { key: 'height', label: 'Height', column: 'stats', kind: 'string' },
    { key: 'weight', label: 'Weight', column: 'stats', kind: 'string' },
    { key: 'eyes', label: 'Eyes', column: 'stats', kind: 'string' },
    { key: 'hair', label: 'Hair', column: 'stats', kind: 'string' },
    { key: 'skin', label: 'Skin', column: 'stats', kind: 'string' },
    { key: 'experiencePoints', label: 'Experience Points', column: 'stats', kind: 'number' },
    {
      key: 'attacks',
      label: 'Attacks',
      column: 'combat',
      kind: 'table',
      columns: [
        { key: 'weapon', label: 'Weapon', type: 'text' },
        { key: 'attackBonus', label: 'Attack Bonus', type: 'text' },
        { key: 'damage', label: 'Damage', type: 'text' },
        { key: 'critical', label: 'Critical', type: 'text' },
        { key: 'range', label: 'Range', type: 'text' },
        { key: 'type', label: 'Type', type: 'text' },
        { key: 'ammunition', label: 'Ammunition', type: 'text' },
        { key: 'notes', label: 'Notes', type: 'text' },
      ],
    },
    {
      key: 'money',
      label: 'Money',
      column: 'stats',
      kind: 'record-fixed',
      keys: ['cp', 'sp', 'gp', 'pp'],
      labels: { cp: 'Copper', sp: 'Silver', gp: 'Gold', pp: 'Platinum' },
    },
    { key: 'weightCarried', label: 'Total Weight Carried', column: 'combat', kind: 'number' },
    {
      key: 'encumbrance',
      label: 'Carrying Capacity',
      column: 'combat',
      kind: 'record-fixed',
      keys: ['lightLoad', 'mediumLoad', 'heavyLoad', 'liftOverHead', 'liftOffGround', 'pushOrDrag'],
      labels: {
        lightLoad: 'Light Load',
        mediumLoad: 'Medium Load',
        heavyLoad: 'Heavy Load',
        liftOverHead: 'Lift Over Head',
        liftOffGround: 'Lift Off Ground',
        pushOrDrag: 'Push or Drag',
      },
    },
    { key: 'domainsSpecialtySchool', label: 'Domains / Specialty School', column: 'stats', kind: 'string' },
    { key: 'spellSaveDC', label: 'Spell Save DC', column: 'combat', kind: 'number' },
    {
      key: 'spellsPerDay',
      label: 'Spells per Day',
      column: 'combat',
      kind: 'table',
      columns: [
        { key: 'level', label: 'Spell Level', type: 'number' },
        { key: 'spellsKnown', label: 'Spells Known', type: 'number' },
        { key: 'saveDC', label: 'Save DC', type: 'number' },
        { key: 'perDay', label: 'Spells per Day', type: 'number' },
        { key: 'bonusSpells', label: 'Bonus Spells', type: 'number' },
      ],
    },
    {
      key: 'knownSpells',
      label: 'Known Spells',
      column: 'combat',
      kind: 'table',
      columns: [
        { key: 'level', label: 'Level', type: 'number' },
        { key: 'name', label: 'Spell Name', type: 'text' },
        { key: 'prepared', label: 'Prepared', type: 'text' },
      ],
    },
  ],
};

export default schema;
