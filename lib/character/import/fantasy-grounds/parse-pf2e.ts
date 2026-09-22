// lib/character/import/fantasy-grounds/parse-pf2e.ts
// Reverse of lib/character/export/fantasy-grounds/pf2e.ts — parses a Fantasy
// Grounds PF2E character XML export back into RoleVerse's schema-driven shape
// (lib/character/sheet-schema/pf2e.ts). Browser-only (DOMParser).
//
// LOWEST-CONFIDENCE of the three FG importers: pf2e.ts's own export mapping is
// verified only against a third-party tool's sample, never a real Fantasy
// Grounds PF2E export (unlike 5E and AD&D, both re-verified against real FG
// data) — see .claude/commands/character-sheets.md's "Confidence per system"
// section. This importer inverts exactly that same unverified shape, so
// treat everything it produces as a rough starting point, not a trustworthy
// round-trip. As with 5E, everything the export only folds into <notes>
// (breakdowns, currency, spell details, personal/campaign-notes text) is not
// reconstructed into individual fields — <notes> is copied verbatim for the
// caller to append instead.
import { child, childNumber, childText, idListChildren, parseFGCharacterElement } from './xml-helpers';
import type { ParsedCharacterImport } from '../types';

const ABILITIES: { full: string; tag: string }[] = [
  { full: 'Strength', tag: 'strength' },
  { full: 'Dexterity', tag: 'dexterity' },
  { full: 'Constitution', tag: 'constitution' },
  { full: 'Intelligence', tag: 'intelligence' },
  { full: 'Wisdom', tag: 'wisdom' },
  { full: 'Charisma', tag: 'charisma' },
];

const SAVES = ['fortitude', 'reflex', 'will'] as const;

export function parseFGPf2eCharacterXml(xmlText: string): ParsedCharacterImport | { error: string } {
  const charEl = parseFGCharacterElement(xmlText);
  if ('error' in charEl) return charEl;

  const stats: Record<string, unknown> = {};
  const combat: Record<string, unknown> = {};
  const saves: Record<string, unknown> = {};
  const skills: Record<string, unknown> = {};

  const name = childText(charEl, 'name');
  const race = childText(charEl, 'race');
  const alignment = childText(charEl, 'alignment');
  if (alignment) stats.alignment = alignment;
  const size = childText(charEl, 'size');
  if (size) stats.size = size;
  const senses = childText(charEl, 'senses');
  if (senses) stats.senses = senses;
  const speed = childText(charEl, 'speed');
  if (speed) combat.speed = speed;
  const exp = childNumber(charEl, 'exp');
  if (exp != null) stats.experiencePoints = exp;

  const classDC = childNumber(charEl, 'classdc');
  if (classDC != null) combat.classDC = classDC;
  const perception = childNumber(charEl, 'perceptiontotal');
  if (perception != null) combat.perception = perception;
  const heroPoints = childNumber(charEl, 'hero');
  if (heroPoints != null) combat.heroPoints = heroPoints;
  const spellAttack = childNumber(charEl, 'spellattack');
  if (spellAttack != null) combat.spellAttack = spellAttack;
  const spellDC = childNumber(charEl, 'spelldc');
  if (spellDC != null) combat.spellDC = spellDC;

  const abilitiesEl = child(charEl, 'abilities');
  const abilityScores: Record<string, number> = {};
  for (const { full, tag } of ABILITIES) {
    const score = childNumber(child(abilitiesEl, tag), 'score');
    if (score != null) abilityScores[full] = score;
  }
  if (Object.keys(abilityScores).length > 0) stats.abilityScores = abilityScores;

  const acTotal = childNumber(child(child(charEl, 'ac'), 'totals'), 'general');
  if (acTotal != null) combat.ac = acTotal;

  const savesEl = child(charEl, 'saves');
  const savingThrows: Record<string, number> = {};
  const proficiencyRanks: Record<string, number> = {};
  for (const key of SAVES) {
    const saveEl = child(savesEl, key);
    const total = childNumber(saveEl, 'total');
    if (total != null) savingThrows[key] = total;
    const rank = childNumber(saveEl, 'proflevel');
    if (rank != null) proficiencyRanks[key] = rank;
  }
  if (Object.keys(savingThrows).length > 0) saves.savingThrows = savingThrows;

  const hpEl = child(charEl, 'hp');
  const hp = childNumber(hpEl, 'current') ?? null;
  const maxHp = childNumber(hpEl, 'total') ?? null;
  const temporaryHp = childNumber(hpEl, 'temporary');
  if (temporaryHp != null) combat.temporaryHp = temporaryHp;
  const dying = childNumber(child(charEl, 'dying'), 'total');
  if (dying != null) combat.dying = dying;
  const wounded = childNumber(child(charEl, 'wounded'), 'total');
  if (wounded != null) combat.wounded = wounded;

  const skilllistEl = child(charEl, 'skilllist');
  const skillTotals: Record<string, number> = {};
  if (skilllistEl) {
    for (const entry of idListChildren(skilllistEl)) {
      const label = childText(entry, 'label');
      const total = childNumber(entry, 'total');
      if (!label || total == null) continue;
      skillTotals[label] = total;
      const rank = childNumber(entry, 'proflevel');
      if (rank != null) proficiencyRanks[label] = rank;
    }
  }
  if (Object.keys(skillTotals).length > 0) skills.skills = skillTotals;
  if (Object.keys(proficiencyRanks).length > 0) skills.proficiencyRanks = proficiencyRanks;

  const resistlistEl = child(charEl, 'resistancelist');
  if (resistlistEl) {
    const resist: Record<string, number> = {};
    for (const entry of idListChildren(resistlistEl)) {
      const label = childText(entry, 'label');
      const total = childNumber(entry, 'total');
      if (label && total != null) resist[label] = total;
    }
    if (Object.keys(resist).length > 0) combat.resistancesWeaknesses = resist;
  }

  const conditionlistEl = child(charEl, 'conditionlist');
  if (conditionlistEl) {
    const conditions: Record<string, number> = {};
    for (const entry of idListChildren(conditionlistEl)) {
      const label = childText(entry, 'name');
      const level = childNumber(entry, 'level');
      if (label && level != null) conditions[label] = level;
    }
    if (Object.keys(conditions).length > 0) combat.conditions = conditions;
  }

  const languagelistEl = child(charEl, 'languagelist');
  const languages = idListChildren(languagelistEl)
    .map((l) => childText(l, 'name'))
    .filter(Boolean);
  if (languages.length > 0) skills.languages = languages;

  const featlistEl = child(charEl, 'featlist');
  const feats = idListChildren(featlistEl)
    .map((f) => childText(f, 'name'))
    .filter(Boolean);
  if (feats.length > 0) stats.feats = feats;

  const inventorylistEl = child(charEl, 'inventorylist');
  const equipment = idListChildren(inventorylistEl)
    .map((item) => ({ name: childText(item, 'name'), quantity: childNumber(item, 'count') ?? 1 }))
    .filter((item) => item.name);

  const focuspoints = childNumber(charEl, 'focuspoints');
  if (focuspoints != null) combat.focusPoints = focuspoints;

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

  const notes = childText(charEl, 'notes');

  return {
    name: name || undefined,
    race: race || undefined,
    class: childText(child(charEl, 'class'), 'name') || undefined,
    level: childNumber(child(charEl, 'class'), 'level') ?? 1,
    hp,
    maxHp,
    notes: notes || undefined,
    columns: { stats, combat, saves, skills },
    equipment,
  };
}
