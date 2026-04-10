// lib/mcp/coordinator.ts
// Keyword-based message router — determines which agent should handle a player message.
//
// Architecture decision: simple keyword matching (no router agent).
// All routing decisions are deterministic and fast.
// Add more keywords or categories here as new agents come online in later phases.

import type { AgentRole } from './types';

// ---------------------------------------------------------------------------
// Keyword lists per agent role
// ---------------------------------------------------------------------------

/** Keywords that indicate a rules / mechanics question → Rules Arbiter */
const RULES_KEYWORDS = [
  // Direct rules questions
  'rule',
  'rules',
  'ruling',
  'mechanic',
  'mechanics',
  'how does',
  'how do',
  'what is the',
  'what are the',
  'can i',
  'can my',
  'am i allowed',
  'is it allowed',
  // Specific mechanics
  'thac0',
  'armor class',
  'saving throw',
  'proficiency',
  'ability check',
  'skill check',
  'attack roll',
  'damage roll',
  'spell slot',
  'concentration',
  'advantage',
  'disadvantage',
  'action economy',
  'bonus action',
  'reaction',
  'opportunity attack',
  'initiative',
  'grapple',
  'shove',
  'cover',
  'flanking',
  'sneak attack',
  'spell save',
  'spell attack',
  'ritual casting',
  'wild shape',
  'channel divinity',
  'bardic inspiration',
  'rage',
  'reckless attack',
  'stunning strike',
  'ki point',
  'sorcery point',
  'warlock slot',
  'pact magic',
  'cantrip',
  'spell level',
  'upcast',
  'class feature',
  'subclass',
  'feat',
  'multiclass',
  'proficiency bonus',
  // Conditions
  'blinded',
  'charmed',
  'deafened',
  'exhaustion',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
  // Queries
  'how many',
  'when can i',
  'does this stack',
  'does it stack',
  'stacks with',
  'modifier',
  'dc',
  'difficulty class',
  // PF2E specifics
  'three-action',
  'proficiency rank',
  'untrained',
  'trained',
  'expert',
  'master',
  'legendary',
  // AD&D specifics
  'thac',
  'to-hit',
  'kit',
  'non-weapon proficiency',
  'weapon proficiency',
];

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/**
 * Route a player message to the most appropriate agent role.
 *
 * Priority order:
 * 1. Rules Arbiter — rules/mechanics queries
 * 2. Narrator — everything else (default)
 *
 * Future agents (npc_dialogue, lore_keeper, encounter_builder) will be added here
 * in Phase 6b once they are implemented.
 */
export function routeMessage(message: string): AgentRole {
  const lower = message.toLowerCase();

  // Rules Arbiter: mechanics / rules questions
  if (RULES_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'rules_arbiter';
  }

  // Default: Narrator handles story, scene descriptions, NPC actions
  return 'narrator';
}
