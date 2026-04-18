// lib/mcp/coordinator.ts
// Claude Haiku message router — classifies player messages to the most appropriate agent.
//
// Architecture: Uses Claude Haiku for smarter intent detection than keyword matching.
// Falls back to keyword matching if the API is unavailable or returns an unexpected value,
// so the system degrades gracefully in offline / low-budget scenarios.

import Anthropic from '@anthropic-ai/sdk';

import type { AgentRole } from './types';

// ---------------------------------------------------------------------------
// Haiku classifier
// ---------------------------------------------------------------------------

const HAIKU_MODEL = 'claude-haiku-4-20250514';

const ROUTER_SYSTEM_PROMPT = `You are a message router for a tabletop RPG assistant. 
Classify the player's message into exactly one of the following agent roles:

- narrator: Story narration, scene descriptions, NPC actions, general gameplay, anything not covered below.
- rules_arbiter: Rules questions, mechanic clarifications, how abilities/spells/conditions work.
- npc_dialogue: Requests to speak as a specific NPC, generate NPC dialogue, or roleplay as a character.
- lore_keeper: Campaign lore questions, story history, "what happened in session X", world knowledge.
- encounter_builder: Building or requesting a combat encounter, generating enemies, encounter difficulty.

Reply with ONLY the role name and nothing else. No punctuation, no explanation.`;

/**
 * Route a player message to the most appropriate agent role using Claude Haiku.
 * Falls back to keyword matching if the Haiku call fails.
 */
export async function routeMessage(message: string): Promise<AgentRole> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });

      const response = await client.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 16,
        system: ROUTER_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }],
      });

      const text = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim()
        .toLowerCase();

      const VALID_ROLES: AgentRole[] = [
        'narrator',
        'rules_arbiter',
        'npc_dialogue',
        'lore_keeper',
        'encounter_builder',
      ];

      if (VALID_ROLES.includes(text as AgentRole)) {
        return text as AgentRole;
      }
      // Unexpected value — fall through to keyword fallback
    } catch {
      // API error — fall through to keyword fallback
    }
  }

  return keywordFallback(message);
}

// ---------------------------------------------------------------------------
// Keyword fallback (used when Haiku is unavailable)
// ---------------------------------------------------------------------------

const RULES_KEYWORDS = [
  'rule', 'rules', 'ruling', 'mechanic', 'mechanics',
  'how does', 'how do', 'what is the', 'what are the',
  'can i', 'can my', 'am i allowed', 'is it allowed',
  'thac0', 'armor class', 'saving throw', 'proficiency',
  'ability check', 'skill check', 'attack roll', 'damage roll',
  'spell slot', 'concentration', 'advantage', 'disadvantage',
  'action economy', 'bonus action', 'reaction', 'opportunity attack',
  'initiative', 'grapple', 'shove', 'cover', 'flanking',
  'sneak attack', 'spell save', 'spell attack', 'ritual casting',
  'wild shape', 'channel divinity', 'bardic inspiration',
  'rage', 'reckless attack', 'stunning strike', 'ki point',
  'sorcery point', 'warlock slot', 'pact magic', 'cantrip',
  'spell level', 'upcast', 'class feature', 'subclass',
  'feat', 'multiclass', 'proficiency bonus',
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened',
  'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified',
  'poisoned', 'prone', 'restrained', 'stunned', 'unconscious',
  'how many', 'when can i', 'does this stack', 'does it stack',
  'stacks with', 'modifier', 'dc', 'difficulty class',
  'three-action', 'proficiency rank', 'untrained', 'trained',
  'expert', 'master', 'legendary',
  'thac', 'to-hit', 'kit', 'non-weapon proficiency', 'weapon proficiency',
];

const NPC_KEYWORDS = [
  'speak as', 'voice', 'as the', 'roleplay as', 'npc says',
  'what does', 'have', 'say', 'respond as', 'in character as',
];

const LORE_KEYWORDS = [
  'what happened', 'last session', 'in session', 'who is', 'tell me about',
  'history of', 'lore', 'story so far', 'recap', 'remember when',
  'campaign notes', 'world history', 'backstory',
];

const ENCOUNTER_KEYWORDS = [
  'encounter', 'combat encounter', 'generate enemies', 'build a fight',
  'create a battle', 'enemy group', 'monster group', 'fight scene',
  'encounter difficulty', 'cr encounter', 'balanced encounter',
];

function keywordFallback(message: string): AgentRole {
  const lower = message.toLowerCase();

  if (ENCOUNTER_KEYWORDS.some((kw) => lower.includes(kw))) return 'encounter_builder';
  if (LORE_KEYWORDS.some((kw) => lower.includes(kw))) return 'lore_keeper';
  if (NPC_KEYWORDS.some((kw) => lower.includes(kw))) return 'npc_dialogue';
  if (RULES_KEYWORDS.some((kw) => lower.includes(kw))) return 'rules_arbiter';

  return 'narrator';
}
