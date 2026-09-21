import type { SystemSheetSchema } from './types';

// Mirrors the mechanical content of the Modiphius Fallout 2d20 character
// sheet (S.P.E.C.I.A.L. ability scores, Defense/Initiative, the fixed
// 17-skill list with a Tag flag, Action Points, Luck Points, Radiation,
// damage resistance by type, Perks) — not its printed layout or artwork.
// Brand-new system added to RoleVerse this pass — see
// lib/game-systems/registry.ts's FALLOUT_2D20 entry (no OGL/SRD exists for
// this proprietary Modiphius/Bethesda-licensed game, so ragSource stays
// 'none' — the Rules Arbiter relies on Claude's training knowledge here,
// same posture as this project's other non-OGL systems).
const schema: SystemSheetSchema = {
  gameSystem: 'FALLOUT_2D20',
  fields: [
    { key: 'origin', label: 'Origin', column: 'stats', kind: 'string' },
    { key: 'defense', label: 'Defense', column: 'combat', kind: 'number', keyStat: true, icon: 'shield' },
    { key: 'initiative', label: 'Initiative', column: 'combat', kind: 'number', keyStat: true },
    { key: 'actionPoints', label: 'Action Points', column: 'combat', kind: 'number' },
    {
      key: 'luckPoints',
      label: 'Luck Points',
      column: 'combat',
      kind: 'record-fixed',
      keys: ['current', 'max'],
      labels: { current: 'Current', max: 'Max' },
    },
    {
      key: 'damageResistance',
      label: 'Damage Resistance',
      column: 'combat',
      kind: 'record-fixed',
      keys: ['normal', 'energy', 'radiation', 'poison'],
      labels: { normal: 'Normal', energy: 'Energy', radiation: 'Radiation', poison: 'Poison' },
    },
    {
      key: 'radiation',
      label: 'Radiation',
      column: 'combat',
      kind: 'record-fixed',
      keys: ['current', 'threshold'],
      labels: { current: 'Current Rads', threshold: 'Threshold' },
    },
    {
      key: 'skills',
      label: 'Skills',
      column: 'skills',
      kind: 'record-fixed',
      keys: [
        'athletics',
        'barter',
        'bigGuns',
        'energyWeapons',
        'explosives',
        'lockpick',
        'medicine',
        'meleeWeapons',
        'pilot',
        'repair',
        'science',
        'smallGuns',
        'sneak',
        'speech',
        'survival',
        'throwing',
        'unarmed',
      ],
      labels: {
        athletics: 'Athletics',
        barter: 'Barter',
        bigGuns: 'Big Guns',
        energyWeapons: 'Energy Weapons',
        explosives: 'Explosives',
        lockpick: 'Lockpick',
        medicine: 'Medicine',
        meleeWeapons: 'Melee Weapons',
        pilot: 'Pilot',
        repair: 'Repair',
        science: 'Science',
        smallGuns: 'Small Guns',
        sneak: 'Sneak',
        speech: 'Speech',
        survival: 'Survival',
        throwing: 'Throwing',
        unarmed: 'Unarmed',
      },
    },
    { key: 'tagSkills', label: 'Tag Skills', column: 'skills', kind: 'string-list' },
    { key: 'perks', label: 'Perks', column: 'stats', kind: 'string-list' },
    { key: 'traits', label: 'Traits', column: 'stats', kind: 'string-list' },
    { key: 'addiction', label: 'Addiction', column: 'stats', kind: 'string-list' },
    { key: 'karma', label: 'Karma', column: 'stats', kind: 'string' },
    { key: 'caps', label: 'Caps', column: 'stats', kind: 'number' },
    {
      key: 'weapons',
      label: 'Weapons',
      column: 'combat',
      kind: 'table',
      columns: [
        { key: 'name', label: 'Weapon', type: 'text' },
        { key: 'damage', label: 'Damage', type: 'text' },
        { key: 'range', label: 'Range', type: 'text' },
        { key: 'rateOfFire', label: 'Rate of Fire', type: 'text' },
        { key: 'ammo', label: 'Ammo', type: 'text' },
        { key: 'qualities', label: 'Qualities', type: 'text' },
      ],
    },
    {
      key: 'armor',
      label: 'Armor',
      column: 'combat',
      kind: 'table',
      columns: [
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'damageResistance', label: 'Damage Resistance', type: 'number' },
        { key: 'weight', label: 'Weight', type: 'text' },
      ],
    },
    { key: 'factionReputation', label: 'Faction Reputation', column: 'stats', kind: 'record-open' },
    { key: 'companion', label: 'Companion', column: 'stats', kind: 'text' },
    { key: 'background', label: 'Background', column: 'stats', kind: 'text' },
  ],
};

export default schema;
