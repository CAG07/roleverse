// lib/game-systems/registry.ts
// Central registry mapping system IDs to their GameSystem config objects

import type { GameSystem } from './types';

const add1e: GameSystem = {
  id: 'ADD1E',
  name: 'Advanced Dungeons & Dragons 1st Edition',
  description: 'The original AD&D system with THAC0, Gygaxian dungeon-crawling, and strict class/race restrictions.',
  primaryDie: 'd20',
  abilityScores: ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
  characterSchema: {
    thac0: 'number',
    savingThrows: 'object',
    hitPoints: 'number',
    armorClass: 'number',
  },
  rulesPrompt:
    'You are a rules arbiter for AD&D 1st Edition. Use THAC0 for attack rolls and descending armor class. Enforce strict class and race restrictions per the 1E PHB and DMG.',
  fgRulesetId: '1E',
};

const add2e: GameSystem = {
  id: 'ADD2E',
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

const dnd3_5e: GameSystem = {
  id: '3_5E',
  name: 'Dungeons & Dragons 3.5th Edition',
  description: 'D&D 3.5E with feats, skills, and ascending armor class.',
  primaryDie: 'd20',
  abilityScores: ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
  characterSchema: {
    baseAttackBonus: 'number',
    savingThrows: 'object',
    skills: 'object',
    feats: 'string[]',
    hitPoints: 'number',
    armorClass: 'number',
  },
  rulesPrompt:
    'You are a rules arbiter for D&D 3.5th Edition. Use ascending AC, base attack bonus, and the skills/feats system from the 3.5E SRD.',
  fgRulesetId: '3.5E',
};

const dnd4e: GameSystem = {
  id: '4E',
  name: 'Dungeons & Dragons 4th Edition',
  description: 'D&D 4E with powers, roles, and encounter/daily abilities.',
  primaryDie: 'd20',
  abilityScores: ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
  characterSchema: {
    powers: 'object',
    role: 'string',
    hitPoints: 'number',
    armorClass: 'number',
  },
  rulesPrompt:
    'You are a rules arbiter for D&D 4th Edition. Use at-will, encounter, and daily powers. Apply 4E roles (striker, defender, controller, leader) and the minion/elite/solo monster framework.',
  fgRulesetId: '4E',
};

const dnd5e2014: GameSystem = {
  id: '5E_2014',
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

const dnd5e2024: GameSystem = {
  id: '5E_2024',
  name: 'Dungeons & Dragons 5th Edition (2024)',
  description: 'The revised 2024 D&D 5E with updated classes and the new equipment rules.',
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
    'You are a rules arbiter for D&D 5th Edition (2024 revised rules). Apply the updated 2024 PHB class features, weapon masteries, and spellcasting rules.',
  fgRulesetId: '5E2024',
};

const pathfinder1e: GameSystem = {
  id: 'PATHFINDER',
  name: 'Pathfinder 1st Edition',
  description: 'The original Pathfinder, a refined evolution of D&D 3.5E.',
  primaryDie: 'd20',
  abilityScores: ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
  characterSchema: {
    baseAttackBonus: 'number',
    combatManeuverBonus: 'number',
    skills: 'object',
    feats: 'string[]',
    hitPoints: 'number',
    armorClass: 'number',
  },
  rulesPrompt:
    'You are a rules arbiter for Pathfinder 1st Edition. Use ascending AC, CMB/CMD, and the Pathfinder SRD rules for classes, skills, and spellcasting.',
  fgRulesetId: 'PFRPG',
};

const pathfinder2e: GameSystem = {
  id: 'PATHFINDER_2E',
  name: 'Pathfinder 2nd Edition',
  description: 'Pathfinder 2E with the three-action economy and proficiency ranks.',
  primaryDie: 'd20',
  abilityScores: ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
  characterSchema: {
    proficiencyRanks: 'object',
    actions: 'number',
    hitPoints: 'number',
    armorClass: 'number',
  },
  rulesPrompt:
    'You are a rules arbiter for Pathfinder 2nd Edition. Use the three-action economy (Action, Reaction, Free Action), proficiency ranks (Untrained/Trained/Expert/Master/Legendary), and PF2E condition rules.',
  fgRulesetId: 'PF2',
};

const dcc: GameSystem = {
  id: 'DCC',
  name: 'Dungeon Crawl Classics',
  description: 'Old-school sword & sorcery RPG with funnel character creation and mighty deeds.',
  primaryDie: 'd20',
  abilityScores: ['Strength', 'Agility', 'Stamina', 'Personality', 'Intelligence', 'Luck'],
  characterSchema: {
    mightyDeeds: 'number',
    spellcheck: 'number',
    hitPoints: 'number',
    armorClass: 'number',
  },
  rulesPrompt:
    'You are a rules arbiter for Dungeon Crawl Classics. Use the DCC dice chain, mighty deeds for warriors, patron bond and spellburn for wizards, and disapproval tables for clerics.',
  fgRulesetId: 'DCC',
};

const tor1e: GameSystem = {
  id: 'TOR1E',
  name: 'The One Ring 1st Edition',
  description: 'Narrative-focused Tolkien RPG with the Fellowship Phase and the Shadow mechanic.',
  primaryDie: 'd12',
  abilityScores: ['Body', 'Heart', 'Wits'],
  characterSchema: {
    hope: 'number',
    shadow: 'number',
    endurance: 'number',
  },
  rulesPrompt:
    'You are a rules arbiter for The One Ring 1st Edition. Use the Feat die (d12) and Success dice (d6s), apply the Eye of Sauron result, and track Hope and Shadow for each character.',
  fgRulesetId: 'TOR',
};

const tor2e: GameSystem = {
  id: 'TOR2E',
  name: 'The One Ring 2nd Edition',
  description: 'Revised Tolkien RPG with streamlined rules and the new Fellowship Phase.',
  primaryDie: 'd12',
  abilityScores: ['Body', 'Heart', 'Wits'],
  characterSchema: {
    hope: 'number',
    shadow: 'number',
    endurance: 'number',
  },
  rulesPrompt:
    'You are a rules arbiter for The One Ring 2nd Edition. Apply the revised 2E Fellowship Phase, Feat die (d12) and Success dice, and the Shadow/Hope tracking rules.',
  fgRulesetId: 'TOR2',
};

const cyberpunk2020: GameSystem = {
  id: 'CYBERPUNK_2020',
  name: 'Cyberpunk 2020',
  description: 'The classic dystopian RPG of the dark future with the Friday Night Firefight system.',
  primaryDie: 'd10',
  abilityScores: ['Intelligence', 'Reflexes', 'Cool', 'Technical', 'Luck', 'Attractiveness', 'Movement', 'Body', 'Empathy'],
  characterSchema: {
    humanity: 'number',
    cyberware: 'string[]',
    hitPoints: 'number',
    armorSP: 'number',
  },
  rulesPrompt:
    'You are a rules arbiter for Cyberpunk 2020. Use the FNFF (Friday Night Firefight) combat rules, Streetdeal for social encounters, and track Humanity loss for cyberware installation.',
  fgRulesetId: 'CP2020',
};

/** Internal registry of all game systems keyed by ID */
const systems: Map<string, GameSystem> = new Map([
  [add1e.id, add1e],
  [add2e.id, add2e],
  [dnd3_5e.id, dnd3_5e],
  [dnd4e.id, dnd4e],
  [dnd5e2014.id, dnd5e2014],
  [dnd5e2024.id, dnd5e2024],
  [pathfinder1e.id, pathfinder1e],
  [pathfinder2e.id, pathfinder2e],
  [dcc.id, dcc],
  [tor1e.id, tor1e],
  [tor2e.id, tor2e],
  [cyberpunk2020.id, cyberpunk2020],
]);

/** Fantasy Grounds ruleset ID to game system ID mapping */
const fgRulesetMap: Map<string, string> = new Map([
  [add1e.fgRulesetId, add1e.id],
  [add2e.fgRulesetId, add2e.id],
  [dnd3_5e.fgRulesetId, dnd3_5e.id],
  [dnd4e.fgRulesetId, dnd4e.id],
  [dnd5e2014.fgRulesetId, dnd5e2014.id],
  [dnd5e2024.fgRulesetId, dnd5e2024.id],
  [pathfinder1e.fgRulesetId, pathfinder1e.id],
  [pathfinder2e.fgRulesetId, pathfinder2e.id],
  [dcc.fgRulesetId, dcc.id],
  [tor1e.fgRulesetId, tor1e.id],
  [tor2e.fgRulesetId, tor2e.id],
  [cyberpunk2020.fgRulesetId, cyberpunk2020.id],
]);

/** Get a game system configuration by its ID */
export function getGameSystem(id: string): GameSystem | null {
  return systems.get(id) ?? null;
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

