import type { SystemSheetSchema } from './types';

// Field selection follows the official WotC D&D 5E (2014) character sheet's
// mechanical content (ability scores, saves, the 18-skill list, AC/HP/combat
// stats, spellcasting, death saves, personality fields) — not its page layout
// or artwork, which stays RoleVerse's own dark-module visual design.
const schema: SystemSheetSchema = {
  gameSystem: '5E_2014',
  fields: [
    { key: 'ac', label: 'AC', column: 'combat', kind: 'number', keyStat: true },
    { key: 'initiative', label: 'Initiative', column: 'combat', kind: 'number' },
    { key: 'speed', label: 'Speed', column: 'combat', kind: 'string' },
    { key: 'passivePerception', label: 'Passive Perception', column: 'combat', kind: 'number' },
    { key: 'proficiencyBonus', label: 'Proficiency Bonus', column: 'combat', kind: 'number' },
    { key: 'hitDice', label: 'Hit Dice', column: 'combat', kind: 'string' },
    { key: 'inspiration', label: 'Inspiration', column: 'combat', kind: 'string' },
    { key: 'experiencePoints', label: 'Experience Points', column: 'stats', kind: 'number' },
    { key: 'alignment', label: 'Alignment', column: 'stats', kind: 'string' },
    { key: 'background', label: 'Background', column: 'stats', kind: 'string' },
    { key: 'age', label: 'Age', column: 'stats', kind: 'string' },
    { key: 'height', label: 'Height', column: 'stats', kind: 'string' },
    { key: 'weight', label: 'Weight', column: 'stats', kind: 'string' },
    { key: 'eyes', label: 'Eyes', column: 'stats', kind: 'string' },
    { key: 'skin', label: 'Skin', column: 'stats', kind: 'string' },
    { key: 'hair', label: 'Hair', column: 'stats', kind: 'string' },
    {
      key: 'currency',
      label: 'Currency',
      column: 'stats',
      kind: 'record-fixed',
      keys: ['cp', 'sp', 'ep', 'gp', 'pp'],
      labels: { cp: 'Copper', sp: 'Silver', ep: 'Electrum', gp: 'Gold', pp: 'Platinum' },
    },
    {
      // Actual per-save bonus, keyed by ability abbreviation — the older
      // savingThrowProficiencies field below only records which saves are
      // proficient, not the computed number a player reads off at the table.
      key: 'savingThrows',
      label: 'Saving Throws',
      column: 'saves',
      kind: 'record-fixed',
      keys: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
      labels: {
        STR: 'Strength',
        DEX: 'Dexterity',
        CON: 'Constitution',
        INT: 'Intelligence',
        WIS: 'Wisdom',
        CHA: 'Charisma',
      },
    },
    {
      key: 'savingThrowProficiencies',
      label: 'Saving Throw Proficiencies',
      column: 'saves',
      kind: 'string-list',
    },
    {
      // Official sheet's full 18-skill list, actual computed bonus per skill.
      key: 'skills',
      label: 'Skills',
      column: 'skills',
      kind: 'record-fixed',
      keys: [
        'acrobatics',
        'animalHandling',
        'arcana',
        'athletics',
        'deception',
        'history',
        'insight',
        'intimidation',
        'investigation',
        'medicine',
        'nature',
        'perception',
        'performance',
        'persuasion',
        'religion',
        'sleightOfHand',
        'stealth',
        'survival',
      ],
      labels: {
        acrobatics: 'Acrobatics (Dex)',
        animalHandling: 'Animal Handling (Wis)',
        arcana: 'Arcana (Int)',
        athletics: 'Athletics (Str)',
        deception: 'Deception (Cha)',
        history: 'History (Int)',
        insight: 'Insight (Wis)',
        intimidation: 'Intimidation (Cha)',
        investigation: 'Investigation (Int)',
        medicine: 'Medicine (Wis)',
        nature: 'Nature (Int)',
        perception: 'Perception (Wis)',
        performance: 'Performance (Cha)',
        persuasion: 'Persuasion (Cha)',
        religion: 'Religion (Int)',
        sleightOfHand: 'Sleight of Hand (Dex)',
        stealth: 'Stealth (Dex)',
        survival: 'Survival (Wis)',
      },
    },
    {
      key: 'skillProficiencies',
      label: 'Skill Proficiencies',
      column: 'skills',
      kind: 'string-list',
    },
    {
      // Official sheet's "Proficiencies & Languages" box covers armor, weapons,
      // and tools here — skillProficiencies above only covers skills.
      key: 'equipmentProficiencies',
      label: 'Armor, Weapon & Tool Proficiencies',
      column: 'skills',
      kind: 'string-list',
    },
    { key: 'languages', label: 'Languages', column: 'skills', kind: 'string-list' },
    {
      key: 'deathSaves',
      label: 'Death Saves',
      column: 'combat',
      kind: 'record-fixed',
      keys: ['successes', 'failures'],
      labels: { successes: 'Successes', failures: 'Failures' },
    },
    { key: 'attacks', label: 'Attacks & Spellcasting', column: 'stats', kind: 'string-list' },
    {
      // Open-ended by design: Rage uses, Ki points, Sorcery Points, Superiority
      // Dice, Bardic Inspiration, etc. — which resources exist varies entirely by
      // class/subclass, so a fixed keyset would need constant maintenance.
      key: 'classResources',
      label: 'Class Resources',
      column: 'stats',
      kind: 'record-open',
    },
    {
      // Not `features` — that key collides with AssembledCharacterData.features
      // (the Feature[] from game_data_abilities, always spread in after stats by
      // assembleCharacterData), which silently clobbers this field on display.
      // Legacy data saved under the old `features` key before this rename is
      // recovered via a read-only fallback in assembleCharacterData.ts and the
      // character edit route — nothing under the old key is ever deleted.
      key: 'featuresTraits',
      label: 'Features & Traits',
      column: 'stats',
      kind: 'string-list',
    },
    { key: 'personalityTraits', label: 'Personality Traits', column: 'stats', kind: 'string' },
    { key: 'ideals', label: 'Ideals', column: 'stats', kind: 'string' },
    { key: 'bonds', label: 'Bonds', column: 'stats', kind: 'string' },
    { key: 'flaws', label: 'Flaws', column: 'stats', kind: 'string' },
    { key: 'spellcastingAbility', label: 'Spellcasting Ability', column: 'combat', kind: 'string' },
    { key: 'spellSaveDC', label: 'Spell Save DC', column: 'combat', kind: 'number' },
    { key: 'spellAttackModifier', label: 'Spell Attack Modifier', column: 'combat', kind: 'number' },
    {
      key: 'spellSlots',
      label: 'Spell Slots',
      column: 'combat',
      kind: 'spell-slots',
      levels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    },
    {
      // The official sheet's "Spells Known"/Cantrips boxes — an actual named
      // spell list per level with a prepared marker, distinct from spellSlots
      // above (which only tracks how many slots exist per level).
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
    { key: 'characterAppearance', label: 'Character Appearance', column: 'stats', kind: 'text' },
    { key: 'characterBackstory', label: 'Character Backstory', column: 'stats', kind: 'text' },
    { key: 'alliesOrganizations', label: 'Allies & Organizations', column: 'stats', kind: 'text' },
    { key: 'treasureNotes', label: 'Treasure', column: 'stats', kind: 'text' },
  ],
};

export default schema;
