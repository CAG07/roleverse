import type { SystemSheetSchema } from './types';

// Field selection is grounded in this project's own DCC reference (data/dcc-stub.md,
// an original independently-written mechanics summary) rather than any Goodman Games
// printed sheet — DCC's official character sheet art/layout is their product identity,
// which this project deliberately avoids reproducing (see dcc-stub.md's own note on the
// same principle for named patrons). The mechanical content below (saves, thief skills,
// spellcasting, corruption, patron taint) matches what a DCC character actually tracks.
//
// Occupation, luckySign, alignment, currentLuck, startingLuck, and mercurialMagic
// are deliberately NOT schema fields — they keep the bespoke inputs/display
// SystemFields.tsx's DCC block and DCCSheet.tsx already have (alignment is a
// 3-way select, Luck is dual ability-score-and-resource with its own live
// editor, mercurialMagic is a structured list). `weapons` WAS bespoke the same
// way but had no matching input UI (DCCSheet.tsx rendered `data.weapons` with
// nothing able to write it) — moved to a real schema `table` field below so
// it's actually editable, matching the 0-Level sheet's "Weapons" box.
const schema: SystemSheetSchema = {
  gameSystem: 'DCC',
  fields: [
    { key: 'title', label: 'Title', column: 'stats', kind: 'string' },
    { key: 'ac', label: 'AC', column: 'combat', kind: 'number', keyStat: true, icon: 'shield' },
    { key: 'initiative', label: 'Initiative', column: 'combat', kind: 'number' },
    { key: 'speed', label: 'Speed', column: 'combat', kind: 'string' },
    { key: 'actionDice', label: 'Action Dice', column: 'combat', kind: 'string' },
    { key: 'baseAttack', label: 'Attack', column: 'combat', kind: 'string' },
    { key: 'critDie', label: 'Crit Die', column: 'combat', kind: 'string' },
    { key: 'critTable', label: 'Crit Table', column: 'combat', kind: 'string' },
    { key: 'luckyRoll', label: 'Lucky Roll', column: 'combat', kind: 'string' },
    { key: 'experiencePoints', label: 'Experience Points', column: 'stats', kind: 'number' },
    {
      // DCC's ability-modifier table is NOT the 5E floor((score-10)/2) formula
      // (confirmed against real Fantasy Grounds data — see
      // lib/character/export/fantasy-grounds/dcc.ts). Rather than guess, this
      // is a plain manually-entered value per the sheet's own "Modifier: ___"
      // boxes, looked up from the real DCC table.
      key: 'abilityModifiers',
      label: 'Ability Modifiers',
      column: 'stats',
      kind: 'record-fixed',
      keys: ['strength', 'agility', 'stamina', 'personality', 'luck', 'intelligence'],
      labels: {
        strength: 'Strength',
        agility: 'Agility',
        stamina: 'Stamina',
        personality: 'Personality',
        luck: 'Luck',
        intelligence: 'Intelligence',
      },
    },
    {
      key: 'attackModifiers',
      label: 'Attack & Damage Modifiers',
      column: 'combat',
      kind: 'record-fixed',
      keys: ['meleeAttack', 'meleeDamage', 'missileAttack', 'missileDamage'],
      labels: {
        meleeAttack: 'Melee Attack',
        meleeDamage: 'Melee Damage',
        missileAttack: 'Missile Attack',
        missileDamage: 'Missile Damage',
      },
    },
    {
      key: 'weapons',
      label: 'Weapons',
      column: 'combat',
      kind: 'table',
      columns: [
        { key: 'name', label: 'Weapon', type: 'text' },
        { key: 'attackMod', label: 'Attack Mod', type: 'number' },
        { key: 'damage', label: 'Damage', type: 'text' },
        { key: 'notes', label: 'Notes', type: 'text' },
      ],
    },
    { key: 'deedDie', label: 'Deed Die (Warriors / Dwarves)', column: 'combat', kind: 'string' },
    { key: 'backstab', label: 'Backstab (Thieves / Halflings)', column: 'combat', kind: 'string' },
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
      key: 'patronTaint',
      label: 'Patron Taint (Patron-Bonded Casters)',
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
    {
      // Percentile skills for Thieves/Halflings (sneak silently, hide in shadows,
      // pick locks, pick pockets, disable traps, climb sheer surfaces, forge
      // documents, handle poison, read languages, cast spell from scroll) — open
      // record since the exact list varies by table/printing (dcc-stub.md, "Core
      // Thief Skills").
      key: 'thiefSkills',
      label: 'Thief Skills (%)',
      column: 'skills',
      kind: 'record-open',
    },
    {
      key: 'knownSpells',
      label: 'Known Spells (Wizards / Clerics / Elves)',
      column: 'stats',
      kind: 'string-list',
    },
    { key: 'languages', label: 'Languages', column: 'skills', kind: 'string-list' },
  ],
};

export default schema;
