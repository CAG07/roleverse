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

const HAIKU_MODEL = process.env.ANTHROPIC_HAIKU_MODEL!;

const ROUTER_SYSTEM_PROMPT = `You are a message router for a tabletop RPG assistant.
Classify the player's message into exactly one of these agent roles and reply with ONLY the role name — no punctuation, no explanation.

───────────────────────────────────────────
AGENT ROLES
───────────────────────────────────────────

narrator
  Default agent. Handles present-tense player actions, exploration, scene
  interaction, and anything not clearly belonging to another agent.
  Examples:
    "I head north toward the mountains"
    "I enter the tavern"
    "I search the room for traps"
    "I draw my sword and ready my shield"
    "I attack the goblin"
    "I dodge behind the pillar"
    "I try to pick the lock"
    "I make camp for the night"
    "I listen at the door"
    "What does the room look like?"
    "I examine the strange symbol on the wall"
    "I run from the bandits"
    "What do the guards do?"
    "I try to intimidate the guard"
    "Who are those people?"

npc_dialogue
  Handles messages where the player is speaking TO a named or present NPC,
  or explicitly requesting an NPC voice or reaction.
  Examples:
    "I ask the innkeeper about available rooms"
    "I tell the merchant we are looking for information"
    "I warn the guard captain that danger is coming"
    "I try to convince the elder to help us"
    "I offer the thief a deal"
    "What does the merchant say to our offer?"
    "Have the captain respond to our proposal"
    "Play the old wizard reaction"
    "I negotiate with the guild master"
    "I try to charm the noble"
    "I plead with the guard"
    "I greet the merchant and ask about the road north"
    "I approach the guard and ask if we can pass"
    "I wave to the innkeeper and ask for a room"
    "I ask the barkeep what he knows about the missing miners"
    "I persuade her to lower her price"
    "What would an innkeeper say about that?"

rules_arbiter
  Handles questions about game mechanics, rules, stats, and how the system works.
  Examples:
    "How does grappling work?"
    "What is the range on fireball?"
    "Can I use a bonus action to disengage?"
    "How many spell slots do I have at level 5?"
    "What does the prone condition do?"
    "Does my rage bonus apply to this damage?"
    "Can I cast two spells in one turn?"
    "Can my character multiclass?"
    "Is sneak attack allowed on this attack?"
    "What is my THAC0 against plate armor?"
    "How does the three-action economy work?"
    "How much XP do I need for level 6?"
    "What is the damage for a greataxe?"
    "How long does paralysis last?"
    "What happens when I fail a death saving throw?"
    "Can I act while concentrating on a spell?"
    "How does spell burn work?"
    "What is the CR of a beholder?"
    "How do saving throws work in AD&D?"

lore_keeper
  Handles recall questions about established campaign facts, past sessions,
  NPCs already encountered, locations visited, and ongoing quest details.
  These are memory questions about what HAS happened, not what is happening now.
  Examples:
    "What was the sheriff name?"
    "Who hired us for this job?"
    "What was that merchant we met called?"
    "Which guard let us through last time?"
    "What happened in the last session?"
    "Where did we find the amulet?"
    "How did we escape from the prison?"
    "What did the wizard tell us about the artifact?"
    "What is the name of this town?"
    "Where is the thieves guild located?"
    "Which inn did we stay at before?"
    "What is our current quest?"
    "What were we supposed to deliver?"
    "Who are we working for?"
    "What did we learn about the cult?"
    "Are we on good terms with the merchants guild?"
    "Does the baron know who we are?"
    "What do the villagers think of us?"
    "Who was that person we met at the crossroads?"
    "Remind me what is going on with the storyline"
    "What happened to the missing miners?"
    "What was the merchant name?"
    "What was his name again?"
    "Do you remember the sheriff name?"
    "What was the name of that guard we met?"
    "Let's return to where we were in our previous session"
    "Pick up where we left off"
    "Where did we leave off last time?"
    "Continue from our last session"

encounter_builder
  Handles requests to generate, design, or build a combat encounter or enemy group.
  Examples:
    "Build me a bandit ambush for a party of four"
    "Create a random encounter in the forest"
    "Generate a dungeon boss fight"
    "What monsters would guard an ancient tomb?"
    "Give me a hard encounter for level 5 characters"
    "Create a challenging but survivable fight"
    "What would a goblin war band look like?"
    "Generate a patrol of undead"
    "Create a rival adventuring party as antagonists"
    "Design an ambush with archers and melee fighters"
    "What enemies would work well in a swamp?"
    "How many goblins should we fight at this level?"

───────────────────────────────────────────
DISAMBIGUATION RULES (apply in order)
───────────────────────────────────────────

1. "Build / create / generate an encounter / enemies / a fight" → encounter_builder
2. "How does X work / Can I do X / What is the rule for X / What is the stat for X" → rules_arbiter
3. "What was / Who was / What happened / Where did / Who hired / Remind me" (past tense recall) → lore_keeper
4. Player speaking TO a named or present NPC ("I ask [NPC]", "I tell [NPC]", "I warn [NPC]") → npc_dialogue
5. Request for an NPC voice or reaction ("What does [NPC] say?", "Have [NPC] respond") → npc_dialogue
6. Present-tense player action ("I [verb]") → narrator
7. When ambiguous → narrator

KEY DISTINCTIONS:
- "I greet [NPC] and ask [topic]" → npc_dialogue (greeting + question directed at present NPC)
- "I ask the sheriff about the road" (NPC present, speaking to them) → npc_dialogue
- "What was the sheriff name?" (past recall, NPC not present) → lore_keeper
- "I attack the goblin" (action) → narrator
- "How do I attack?" (rule question) → rules_arbiter
- "I try to intimidate the guard" (player action) → narrator
- "What does the guard say?" (NPC voice request) → npc_dialogue
- "Who are those people?" (scene, NPCs present) → narrator
- "Who was that person we met before?" (past recall) → lore_keeper
- "What does this symbol mean?" (current scene) → narrator
- "What did that symbol mean that we found before?" (past recall) → lore_keeper
- "Let's return to / pick up where / where did we leave off" → lore_keeper (session continuity recall)`;

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
  // Session continuity recall
  'previous session', 'last time', 'where we were', 'pick up where',
  'continue from', 'return to where', 'where did we leave',
  // Past-tense name and fact recall — checked before NPC keywords
  'what was', 'who was', 'name again', 'his name', 'her name', 'their name',
  "what's his name", "what's her name", 'do you remember',
  // Existing keywords
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
