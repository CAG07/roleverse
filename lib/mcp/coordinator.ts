// lib/mcp/coordinator.ts
// Claude Haiku message router — classifies player messages to the most appropriate agent.
//
// Three agents: game_master (default), rules_arbiter, lore_keeper.
// Falls back to keyword matching if the API is unavailable or returns an unexpected value.

import Anthropic from '@anthropic-ai/sdk';

import type { AgentRole } from './types';

// ---------------------------------------------------------------------------
// Haiku classifier
// ---------------------------------------------------------------------------

function getRequiredHaikuModel(): string {
  const model = process.env.ANTHROPIC_HAIKU_MODEL;
  if (!model) throw new Error('ANTHROPIC_HAIKU_MODEL environment variable is required');
  return model;
}

const HAIKU_MODEL = getRequiredHaikuModel();

const ROUTER_SYSTEM_PROMPT = `You are a message router for a tabletop RPG assistant.
Classify the player's message into exactly one of these agent roles and reply with ONLY the role name — no punctuation, no explanation.

───────────────────────────────────────────
AGENT ROLES
───────────────────────────────────────────

game_master
  DEFAULT agent. Handles all present-tense player actions, scene exploration,
  NPC interaction (talking to NPCs, asking NPCs questions, NPC reactions),
  combat, encounters, and anything not clearly a rules question or past-recall.
  Examples:
    "I head north toward the mountains"
    "I enter the tavern"
    "I search the room for traps"
    "I attack the goblin"
    "I dodge behind the pillar"
    "I try to pick the lock"
    "I make camp for the night"
    "What does the room look like?"
    "I examine the strange symbol on the wall"
    "I try to intimidate the guard"
    "I greet the merchant and ask about the road north"
    "I ask the barkeep her name"
    "I ask the innkeeper about available rooms"
    "I warn the guard captain that danger is coming"
    "What does the merchant say to our offer?"
    "I negotiate with the guild master"
    "I persuade her to lower her price"
    "Build me a forest encounter"
    "What monsters would guard an ancient tomb?"
    "Give me a hard encounter for my party"

rules_arbiter
  Handles questions about game mechanics, rules, stats, and how the system works.
  Examples:
    "How does grappling work?"
    "What is the range on fireball?"
    "Can I use a bonus action to disengage?"
    "How many spell slots do I have at level 5?"
    "What does the prone condition do?"
    "Can I cast two spells in one turn?"
    "What is my THAC0 against plate armor?"
    "How does the three-action economy work?"
    "What is the damage for a greataxe?"
    "How do saving throws work in AD&D?"

lore_keeper
  Handles recall questions about established campaign facts, past sessions,
  NPCs already encountered, locations visited, and ongoing quest details.
  These are MEMORY questions about what HAS happened — not actions happening now.
  Examples:
    "What was the sheriff's name?"
    "Who hired us for this job?"
    "What was that merchant we met called?"
    "What happened in the last session?"
    "Where did we find the amulet?"
    "What did the wizard tell us about the artifact?"
    "What is the name of this town?"
    "Who are we working for?"
    "What did we learn about the cult?"
    "Who was that person we met at the crossroads?"
    "What happened to the missing miners?"
    "Let's return to where we were in our previous session"
    "Pick up where we left off"
    "Where did we leave off last time?"
    "Continue from our last session"

───────────────────────────────────────────
DISAMBIGUATION RULES (apply in order)
───────────────────────────────────────────

1. "How does X work / Can I do X / What is the rule for X / What is the stat for X" → rules_arbiter
2. "What was / Who was / What happened / Where did / Who hired / Remind me" (past-tense recall) → lore_keeper
3. "Let's return to / pick up where / where did we leave off" → lore_keeper
4. Everything else → game_master

KEY DISTINCTIONS:
- "I ask the barkeep her name" (NPC present, player speaking to her NOW) → game_master
- "What was the barkeep's name?" (past recall, NPC not present) → lore_keeper
- "I greet the merchant and ask about the road" (present action, NPC interaction) → game_master
- "What was the merchant's name?" (past recall) → lore_keeper
- "Build me a forest encounter" (encounter request) → game_master
- "How do I attack?" (rule question) → rules_arbiter
- "I attack the goblin" (action) → game_master
- When ambiguous → game_master`;

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

      const VALID_ROLES: AgentRole[] = ['game_master', 'rules_arbiter', 'lore_keeper'];
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
  'how many', 'when can i', 'does this stack', 'stacks with',
  'modifier', 'difficulty class',
  'three-action', 'proficiency rank', 'untrained', 'trained',
  'expert', 'master', 'legendary',
  'thac', 'to-hit', 'non-weapon proficiency', 'weapon proficiency',
];

const LORE_KEYWORDS = [
  // Session continuity recall
  'previous session', 'last time', 'where we were', 'pick up where',
  'continue from', 'return to where', 'where did we leave',
  // Past-tense name and fact recall
  'what was', 'who was', 'name again', 'his name', 'her name', 'their name',
  "what's his name", "what's her name", 'do you remember',
  // General lore recall
  'what happened', 'last session', 'in session', 'who is', 'tell me about',
  'history of', 'lore', 'story so far', 'recap', 'remember when',
  'campaign notes', 'world history', 'backstory',
];

function keywordFallback(message: string): AgentRole {
  const lower = message.toLowerCase();
  if (RULES_KEYWORDS.some((kw) => lower.includes(kw))) return 'rules_arbiter';
  if (LORE_KEYWORDS.some((kw) => lower.includes(kw))) return 'lore_keeper';
  return 'game_master';
}
