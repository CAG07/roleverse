// lib/game-systems/registry.ts
// Central registry mapping system IDs to their GameSystem config objects

import type { GameSystem } from './types';

const add2e: GameSystem = {
  id: 'add-2e',
  name: 'Advanced Dungeons & Dragons 2nd Edition',
  description:
    'The classic AD&D 2nd Edition system featuring THAC0, proficiencies, and kits.',
  primaryDie: 'd20',
  abilityScores: ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
  characterSchema: {
    thac0: 'number',
    savingThrows: 'object',
    proficiencies: 'string[]',
    kit: 'string',
    hitPoints: 'number',
    armorClass: 'number',
  },
  rulesPrompt:
    'You are a rules arbiter for AD&D 2nd Edition. Use THAC0 for attack rolls, descending armor class, and 2E saving throw categories (Paralyzation/Poison/Death Magic, Rod/Staff/Wand, Petrification/Polymorph, Breath Weapon, Spell). Enforce proficiency slots and kit restrictions.',
  fgRulesetId: '2E',
};

const dnd5e2014: GameSystem = {
  id: 'dnd-5e-2014',
  name: 'Dungeons & Dragons 5th Edition (2014)',
  description:
    'The 2014 version of D&D 5th Edition with bounded accuracy and advantage/disadvantage.',
  primaryDie: 'd20',
  abilityScores: ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
  characterSchema: {
    proficiencyBonus: 'number',
    savingThrows: 'string[]',
    skills: 'string[]',
    hitPoints: 'number',
    armorClass: 'number',
    spellSlots: 'object',
  },
  rulesPrompt:
    'You are a rules arbiter for D&D 5th Edition (2014 rules). Use the advantage/disadvantage system, bounded accuracy, and proficiency bonus. Apply 2014 PHB rules for class features, spellcasting, and combat.',
  fgRulesetId: '5E',
};

/** Internal registry of all game systems keyed by ID */
const systems: Map<string, GameSystem> = new Map([
  [add2e.id, add2e],
  [dnd5e2014.id, dnd5e2014],
]);

/** Fantasy Grounds ruleset ID to game system ID mapping */
const fgRulesetMap: Map<string, string> = new Map([
  [add2e.fgRulesetId, add2e.id],
  [dnd5e2014.fgRulesetId, dnd5e2014.id],
]);

/** Get a game system configuration by its ID */
export function getGameSystem(id: string): GameSystem {
  const system = systems.get(id);
  if (!system) {
    const validIds = Array.from(systems.keys()).join(', ');
    throw new Error(`Unknown game system: ${id}. Valid systems: ${validIds}`);
  }
  return system;
}

/** Get all registered game systems */
export function getAllGameSystems(): GameSystem[] {
  return Array.from(systems.values());
}

/** Look up a game system by its Fantasy Grounds ruleset identifier */
export function getSystemByFGRuleset(rulesetId: string): GameSystem | null {
  const systemId = fgRulesetMap.get(rulesetId);
  if (!systemId) {
    return null;
  }
  return systems.get(systemId) ?? null;
}
