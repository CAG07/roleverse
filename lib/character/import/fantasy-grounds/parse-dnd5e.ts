// lib/character/import/fantasy-grounds/parse-dnd5e.ts
// Reverse of lib/character/export/fantasy-grounds/dnd5e.ts — parses a Fantasy
// Grounds 5E character XML export back into RoleVerse's schema-driven shape
// (lib/character/sheet-schema/dnd5e.ts). Browser-only (DOMParser), matching
// this project's "no XML library" precedent.
//
// Only imports the tags the export side documents as real/direct (verified
// against a real sample per fantasy-grounds/dnd5e.ts's header). Everything
// the export folds into a single <notes> leaf instead of a dedicated tag
// (currency, spellcasting ability/DC/attack, known spells, appearance,
// backstory, allies, treasure) is NOT reconstructed into individual fields
// here — that would mean guessing a parse of free text the export itself
// only wrote because there was no confirmed structured slot for it. Instead
// <notes> is copied verbatim into `notes` for the caller to append to the
// character's own Notes field, so nothing is silently dropped.
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

const SKILLS: { key: string; name: string }[] = [
  { key: 'acrobatics', name: 'Acrobatics' },
  { key: 'animalHandling', name: 'Animal Handling' },
  { key: 'arcana', name: 'Arcana' },
  { key: 'athletics', name: 'Athletics' },
  { key: 'deception', name: 'Deception' },
  { key: 'history', name: 'History' },
  { key: 'insight', name: 'Insight' },
  { key: 'intimidation', name: 'Intimidation' },
  { key: 'investigation', name: 'Investigation' },
  { key: 'medicine', name: 'Medicine' },
  { key: 'nature', name: 'Nature' },
  { key: 'perception', name: 'Perception' },
  { key: 'performance', name: 'Performance' },
  { key: 'persuasion', name: 'Persuasion' },
  { key: 'religion', name: 'Religion' },
  { key: 'sleightOfHand', name: 'Sleight of Hand' },
  { key: 'stealth', name: 'Stealth' },
  { key: 'survival', name: 'Survival' },
];

export function parseFGDnd5eCharacterXml(xmlText: string): ParsedCharacterImport | { error: string } {
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
  const background = childText(charEl, 'background');
  if (background) stats.background = background;
  const exp = childNumber(charEl, 'exp');
  if (exp != null) stats.experiencePoints = exp;
  for (const key of ['age', 'height', 'weight', 'eyes', 'skin', 'hair'] as const) {
    const value = childText(charEl, key);
    if (value) stats[key] = value;
  }

  const perception = childNumber(charEl, 'perception');
  if (perception != null) combat.passivePerception = perception;
  const initiative = childNumber(charEl, 'initiative');
  if (initiative != null) combat.initiative = initiative;
  const speed = childText(charEl, 'speed');
  if (speed) combat.speed = speed;

  const abilitiesEl = child(charEl, 'abilities');
  const abilityScores: Record<string, number> = {};
  const savingThrows: Record<string, number> = {};
  const savingThrowProficiencies: string[] = [];
  for (const { full, tag } of ABILITIES) {
    const abilityEl = child(abilitiesEl, tag);
    const score = childNumber(abilityEl, 'score');
    if (score != null) abilityScores[full] = score;
    const save = childNumber(abilityEl, 'save');
    if (save != null) savingThrows[full.slice(0, 3).toUpperCase()] = save;
    if (childNumber(abilityEl, 'saveprof') === 1) savingThrowProficiencies.push(full);
  }
  if (Object.keys(abilityScores).length > 0) stats.abilityScores = abilityScores;
  if (Object.keys(savingThrows).length > 0) saves.savingThrows = savingThrows;
  if (savingThrowProficiencies.length > 0) saves.savingThrowProficiencies = savingThrowProficiencies;

  const ac = childNumber(child(child(charEl, 'defenses'), 'ac'), 'total');
  if (ac != null) combat.ac = ac;

  const hpEl = child(charEl, 'hp');
  const hpTotal = childNumber(hpEl, 'total');
  const wounds = childNumber(hpEl, 'wounds') ?? 0;
  const maxHp = hpTotal ?? null;
  const hp = hpTotal != null ? hpTotal - wounds : null;
  const deathSuccess = childNumber(hpEl, 'deathsavesuccess');
  const deathFail = childNumber(hpEl, 'deathsavefail');
  if (deathSuccess != null || deathFail != null) {
    combat.deathSaves = { successes: deathSuccess ?? 0, failures: deathFail ?? 0 };
  }

  const classesEl = child(charEl, 'classes');
  const firstClass = idListChildren(classesEl)[0] ?? null;
  const className = childText(firstClass, 'name');
  const level = childNumber(firstClass, 'level') ?? 1;

  const skilllistEl = child(charEl, 'skilllist');
  const skillTotals: Record<string, number> = {};
  const skillProficiencies: string[] = [];
  if (skilllistEl) {
    const byName = new Map(SKILLS.map((s) => [s.name.toLowerCase(), s.key]));
    for (const entry of idListChildren(skilllistEl)) {
      const label = childText(entry, 'name');
      const key = byName.get(label.toLowerCase());
      if (!key) continue;
      const total = childNumber(entry, 'total');
      if (total != null) skillTotals[key] = total;
      if (childNumber(entry, 'prof') === 1) skillProficiencies.push(label);
    }
  }
  if (Object.keys(skillTotals).length > 0) skills.skills = skillTotals;
  if (skillProficiencies.length > 0) skills.skillProficiencies = skillProficiencies;

  const languagelistEl = child(charEl, 'languagelist');
  const languages = idListChildren(languagelistEl)
    .map((l) => childText(l, 'name'))
    .filter(Boolean);
  if (languages.length > 0) skills.languages = languages;

  const proficienciesText = childText(charEl, 'proficiencies');
  if (proficienciesText) {
    skills.equipmentProficiencies = proficienciesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const attacknotes = childText(charEl, 'attacknotes');
  if (attacknotes) stats.attacks = attacknotes.split('\n').filter(Boolean);
  const featurenotes = childText(charEl, 'featurenotes');
  if (featurenotes) stats.featuresTraits = featurenotes.split('\n').filter(Boolean);

  for (const [tag, key] of [
    ['personalitytraits', 'personalityTraits'],
    ['ideals', 'ideals'],
    ['bonds', 'bonds'],
    ['flaws', 'flaws'],
  ] as const) {
    const value = childText(charEl, tag);
    if (value) stats[key] = value;
  }

  const inventorylistEl = child(charEl, 'inventorylist');
  const equipment = idListChildren(inventorylistEl)
    .map((item) => ({ name: childText(item, 'name'), quantity: childNumber(item, 'count') ?? 1 }))
    .filter((item) => item.name);

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
    class: className || undefined,
    level,
    hp,
    maxHp,
    notes: notes || undefined,
    columns: { stats, combat, saves, skills },
    equipment,
  };
}
