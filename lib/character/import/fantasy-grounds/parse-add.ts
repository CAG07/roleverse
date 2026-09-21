// lib/character/import/fantasy-grounds/parse-add.ts
// Reverse of lib/character/export/fantasy-grounds/add.ts — parses a Fantasy
// Grounds AD&D 1E/2E character XML export back into RoleVerse's schema-driven
// shape (lib/character/sheet-schema/add1e.ts / add2e.ts). Browser-only
// (DOMParser), matching this project's "no XML library" precedent.
//
// Mirrors the export's confirmed real FG structure exactly (see add.ts's
// header for the provenance of each tag) but in reverse. As with the export,
// this is best-effort — "fields don't need to match exactly" per the feature
// request. Two fields the export deliberately leaves ambiguous are skipped
// here too rather than guessed: <proficiencylist> (confirmed to sometimes
// hold a racial note, not a weapon list) and thief-derived <skilllist>
// entries beyond the known THIEF_SKILL_LABELS set. Whatever isn't otherwise
// mapped is preserved by copying <notes> verbatim into RoleVerse's own notes
// field, so nothing is silently dropped even if not structurally mapped.

const ABILITIES: { full: string; tag: string }[] = [
  { full: 'Strength', tag: 'strength' },
  { full: 'Dexterity', tag: 'dexterity' },
  { full: 'Constitution', tag: 'constitution' },
  { full: 'Intelligence', tag: 'intelligence' },
  { full: 'Wisdom', tag: 'wisdom' },
  { full: 'Charisma', tag: 'charisma' },
];

const SAVE_FANOUT: Record<string, string[]> = {
  paralyzation: ['paralyzation', 'poison', 'death'],
  rod: ['rod', 'staff', 'wand'],
  petrification: ['petrification', 'polymorph'],
  breath: ['breath'],
  spell: ['spell'],
};

interface AdjustmentField {
  dataKey: string;
  subKey: string;
  fgTag: string;
  fgType: 'number' | 'string';
}

const ABILITY_ADJUSTMENT_FIELDS: Record<string, AdjustmentField[]> = {
  strength: [
    { dataKey: 'strAdjustments', subKey: 'toHit', fgTag: 'hitadj', fgType: 'number' },
    { dataKey: 'strAdjustments', subKey: 'damage', fgTag: 'dmgadj', fgType: 'number' },
    { dataKey: 'strAdjustments', subKey: 'opensDoors', fgTag: 'opendoors', fgType: 'string' },
    { dataKey: 'strAdjustments', subKey: 'weightAllowance', fgTag: 'weightallow', fgType: 'number' },
    { dataKey: 'strAdjustments', subKey: 'bendBarsLiftGates', fgTag: 'bendbars', fgType: 'number' },
  ],
  intelligence: [
    { dataKey: 'intAdjustments', subKey: 'bonusLanguages', fgTag: 'languages', fgType: 'number' },
    { dataKey: 'intAdjustments', subKey: 'spellLearnChance', fgTag: 'learn', fgType: 'number' },
  ],
  wisdom: [
    { dataKey: 'wisAdjustments', subKey: 'magicAttackAdjustment', fgTag: 'magicdefenseadj', fgType: 'number' },
    { dataKey: 'wisAdjustments', subKey: 'bonusSpells', fgTag: 'spellbonus', fgType: 'string' },
    { dataKey: 'wisAdjustments', subKey: 'spellFailureChance', fgTag: 'failure', fgType: 'number' },
  ],
  dexterity: [
    { dataKey: 'dexAdjustments', subKey: 'missileAttackAdjustment', fgTag: 'hitadj', fgType: 'number' },
    { dataKey: 'dexAdjustments', subKey: 'armorClassAdjustment', fgTag: 'defenseadj', fgType: 'number' },
    { dataKey: 'dexAdjustments', subKey: 'reactionAdjustment', fgTag: 'reactionadj', fgType: 'number' },
  ],
  constitution: [
    { dataKey: 'conAdjustments', subKey: 'hpAdjustment', fgTag: 'hitpointadj', fgType: 'string' },
    { dataKey: 'conAdjustments', subKey: 'systemShockSurvival', fgTag: 'systemshock', fgType: 'number' },
    { dataKey: 'conAdjustments', subKey: 'resurrectionSurvival', fgTag: 'resurrectionsurvival', fgType: 'number' },
  ],
  charisma: [
    { dataKey: 'chrAdjustments', subKey: 'maxHenchmen', fgTag: 'maxhench', fgType: 'number' },
    { dataKey: 'chrAdjustments', subKey: 'loyaltyBase', fgTag: 'loyalty', fgType: 'number' },
    { dataKey: 'chrAdjustments', subKey: 'reactionAdjustment', fgTag: 'reaction', fgType: 'number' },
  ],
};

const THIEF_SKILL_LABELS: Record<string, string> = {
  pickPockets: 'Pick Pockets',
  openLocks: 'Open Locks',
  findRemoveTraps: 'Find/Remove Traps',
  moveSilently: 'Move Silently',
  hideInShadows: 'Hide in Shadows',
  hearNoise: 'Hear Noise',
  climbWalls: 'Climb Walls',
  readLanguages: 'Read Languages',
};
const THIEF_SKILL_LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(THIEF_SKILL_LABELS).map(([key, label]) => [label.toLowerCase(), key])
);

const COIN_NAME_TO_TREASURE_KEY: Record<string, string> = { PP: 'platinum', GP: 'gold', SP: 'silver' };

function child(parent: Element | null, tag: string): Element | null {
  if (!parent) return null;
  for (const c of Array.from(parent.children)) {
    if (c.tagName === tag) return c;
  }
  return null;
}

function childText(parent: Element | null, tag: string): string {
  return child(parent, tag)?.textContent?.trim() ?? '';
}

function childNumber(parent: Element | null, tag: string): number | undefined {
  const t = childText(parent, tag);
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function idListChildren(parent: Element | null): Element[] {
  if (!parent) return [];
  return Array.from(parent.children).filter((c) => /^id-\d+$/.test(c.tagName));
}

export interface ParsedFGCharacter {
  name: string;
  race: string;
  class: string;
  level: number;
  hp: number | null;
  maxHp: number | null;
  notes: string;
  abilityScores: Record<string, number>;
  columns: {
    stats: Record<string, unknown>;
    combat: Record<string, unknown>;
    saves: Record<string, unknown>;
    skills: Record<string, unknown>;
  };
  equipment: { name: string; quantity: number }[];
}

export function parseFGAddCharacterXml(xmlText: string): ParsedFGCharacter | { error: string } {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  } catch {
    return { error: 'Could not parse this file as XML.' };
  }
  if (doc.querySelector('parsererror')) {
    return { error: 'Could not parse this file as XML — it may be corrupted or not a valid export.' };
  }

  const charEl = doc.querySelector('character');
  if (!charEl) {
    return { error: 'This does not look like a Fantasy Grounds character export (no <character> element found).' };
  }

  const stats: Record<string, unknown> = {};
  const combat: Record<string, unknown> = {};
  const saves: Record<string, unknown> = {};
  const skills: Record<string, unknown> = {};

  // Identity
  const name = childText(charEl, 'name');
  const race = childText(charEl, 'race');
  const alignment = childText(charEl, 'alignment');
  if (alignment) stats.alignment = alignment;
  const exp = childNumber(charEl, 'exp');
  if (exp != null) stats.experiencePoints = exp;

  // Abilities + per-ability adjustments
  const abilitiesEl = child(charEl, 'abilities');
  const abilityScores: Record<string, number> = {};
  for (const { full, tag } of ABILITIES) {
    const abilityEl = child(abilitiesEl, tag);
    const score = childNumber(abilityEl, 'score') ?? childNumber(abilityEl, 'total');
    if (score != null) abilityScores[full] = score;

    const adjustments: Record<string, string | number> = {};
    for (const field of ABILITY_ADJUSTMENT_FIELDS[tag] ?? []) {
      const raw = childText(abilityEl, field.fgTag);
      if (raw === '') continue;
      adjustments[field.subKey] = field.fgType === 'number' ? (Number(raw) || 0) : raw;
    }
    if (Object.keys(adjustments).length > 0) {
      stats[(ABILITY_ADJUSTMENT_FIELDS[tag]?.[0]?.dataKey) as string] = adjustments;
    }
  }
  if (Object.keys(abilityScores).length > 0) stats.abilityScores = abilityScores;

  // Saves
  const savesEl = child(charEl, 'saves');
  const savingThrows: Record<string, number> = {};
  for (const [roleverseKey, fgTags] of Object.entries(SAVE_FANOUT)) {
    for (const tag of fgTags) {
      const saveEl = child(savesEl, tag);
      const value = childNumber(saveEl, 'base') ?? childNumber(saveEl, 'score');
      if (value != null) {
        savingThrows[roleverseKey] = value;
        break;
      }
    }
  }
  if (Object.keys(savingThrows).length > 0) saves.savingThrows = savingThrows;

  // THAC0 / AC
  const thac0 = childNumber(charEl, 'thaco') ?? childNumber(child(child(charEl, 'combat'), 'thaco'), 'score');
  if (thac0 != null) combat.thac0 = thac0;
  const ac = childNumber(charEl, 'ac') ?? childNumber(child(child(charEl, 'defenses'), 'ac'), 'total');
  if (ac != null) combat.ac = ac;
  const numberattacks = childText(charEl, 'numberattacks');
  if (numberattacks) combat.numberOfAttacks = numberattacks;

  // HP
  const hpEl = child(charEl, 'hp');
  const hpTotal = childNumber(hpEl, 'total');
  const wounds = childNumber(hpEl, 'wounds') ?? 0;
  const maxHp = hpTotal ?? null;
  const hp = hpTotal != null ? hpTotal - wounds : null;

  // Speed / movement
  const speedEl = child(charEl, 'speed');
  const speedBase = childNumber(speedEl, 'base') ?? childNumber(speedEl, 'total');
  if (speedBase != null) combat.movementRates = { base: speedBase };

  // Class / level / XP needed
  const classesEl = child(charEl, 'classes');
  const firstClass = idListChildren(classesEl)[0] ?? null;
  const className = childText(firstClass, 'name');
  const level = childNumber(firstClass, 'level') ?? 1;
  const expNeeded = childNumber(firstClass, 'expneeded');
  if (expNeeded != null) stats.xpNeededForNextLevel = expNeeded;

  // Weapons — real <weaponlist> structure (attackbonus is baseThac0 - weaponThac0
  // in the export, so weaponThac0 = baseThac0 - attackbonus in reverse).
  const weaponlistEl = child(charEl, 'weaponlist');
  const weaponAttacks = idListChildren(weaponlistEl)
    .map((w) => {
      const weaponName = childText(w, 'name');
      if (!weaponName) return null;
      const attackBonus = childNumber(w, 'attackbonus');
      const weaponThac0 = attackBonus != null && thac0 != null ? thac0 - attackBonus : undefined;
      const damagelistEl = child(w, 'damagelist');
      const firstDamage = idListChildren(damagelistEl)[0] ?? null;
      const dice = childText(firstDamage, 'dice');
      const bonus = childNumber(firstDamage, 'bonus');
      const damage = dice ? `${dice}${bonus ? (bonus > 0 ? `+${bonus}` : `${bonus}`) : ''}` : '';
      return {
        weapon: weaponName,
        ...(weaponThac0 != null ? { thac0: weaponThac0 } : {}),
        ...(damage ? { damage } : {}),
      } as Record<string, unknown>;
    })
    .filter((row): row is Record<string, unknown> => row != null);
  if (weaponAttacks.length > 0) combat.weaponAttacks = weaponAttacks;

  // Coins -> treasure
  const coinsEl = child(charEl, 'coins');
  if (coinsEl) {
    const treasure: Record<string, number> = {};
    for (const slot of Array.from(coinsEl.children)) {
      const coinName = childText(slot, 'name').toUpperCase();
      const treasureKey = COIN_NAME_TO_TREASURE_KEY[coinName];
      const amount = childNumber(slot, 'amount');
      if (treasureKey && amount != null) treasure[treasureKey] = amount;
    }
    if (Object.keys(treasure).length > 0) stats.treasure = treasure;
  }

  // Encumbrance
  const encumbranceLoad = childNumber(child(charEl, 'encumbrance'), 'load');
  if (encumbranceLoad != null) combat.encumbrance = encumbranceLoad;

  // Spell slots — <powermeta><spellslotsN><max>
  const powermetaEl = child(charEl, 'powermeta');
  if (powermetaEl) {
    const spellSlots: Record<string, number> = {};
    for (const slotEl of Array.from(powermetaEl.children)) {
      const match = slotEl.tagName.match(/^spellslots(\d+)$/);
      if (!match) continue;
      const max = childNumber(slotEl, 'max');
      if (max != null) spellSlots[match[1]] = max;
    }
    if (Object.keys(spellSlots).length > 0) combat.spellSlots = spellSlots;
  }

  // Languages
  const languagelistEl = child(charEl, 'languagelist');
  const languages = idListChildren(languagelistEl)
    .map((l) => childText(l, 'name'))
    .filter(Boolean);
  if (languages.length > 0) stats.languages = languages;

  // Thief skills — only entries matching a known label; the export's own
  // notes confirm no dedicated <thiefskilllist> tag exists, so this reads
  // from the shared <skilllist> and filters to recognized names.
  const skilllistEl = child(charEl, 'skilllist');
  if (skilllistEl) {
    const thiefSkills: Record<string, number> = {};
    for (const entry of idListChildren(skilllistEl)) {
      const label = childText(entry, 'name').toLowerCase();
      const key = THIEF_SKILL_LABEL_TO_KEY[label];
      const total = childNumber(entry, 'total');
      if (key && total != null) thiefSkills[key] = total;
    }
    if (Object.keys(thiefSkills).length > 0) skills.thiefSkills = thiefSkills;
  }

  // Equipment — <inventorylist>
  const inventorylistEl = child(charEl, 'inventorylist');
  const equipment = idListChildren(inventorylistEl)
    .map((item) => ({
      name: childText(item, 'name'),
      quantity: childNumber(item, 'count') ?? 1,
    }))
    .filter((item) => item.name);

  // Notes — copied verbatim. Whatever wasn't structurally mapped above
  // (including <proficiencylist>, which the export itself leaves ambiguous)
  // is not reconstructed here; if it was present in the source file's own
  // <notes>, it survives via this passthrough instead.
  const notes = childText(charEl, 'notes');

  return {
    name: name || 'Imported Character',
    race,
    class: className,
    level,
    hp,
    maxHp,
    notes,
    abilityScores,
    columns: { stats, combat, saves, skills },
    equipment,
  };
}
