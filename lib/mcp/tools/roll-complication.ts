// lib/mcp/tools/roll-complication.ts
// Complication / random-event tool for the GM's own mid-scene curveballs — a
// structured category + prompt from a fixed table, not a raw dice number
// (that's roll-dice.ts's job). Ephemeral: nothing is persisted, this is a
// one-off narrative nudge the GM weaves into the current scene in its own
// words, same "GM rolls, player never sees the mechanics" spirit as
// roll-dice.ts's hidden rolls.

import { registerTool } from '../server';
import type { MCPToolDefinition, MCPToolResult } from '../types';

const rollComplicationDefinition: MCPToolDefinition = {
  name: 'roll-complication',
  description:
    'Roll a random mid-scene complication or event when the scene needs an unexpected turn — ' +
    "the player's plan is going too smoothly, downtime needs an interruption, or a sandbox " +
    'scene needs a spark. Returns a category and a short prompt; weave it into your narration ' +
    'in your own words and never read the category name or mechanics aloud to the player. Use ' +
    'sparingly — not on every turn.',
  inputSchema: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Why you are rolling this, e.g. "scene has gone quiet, needs a spark"',
      },
    },
    required: [],
  },
};

interface ComplicationCategory {
  category: string;
  prompts: string[];
}

const COMPLICATION_TABLE: ComplicationCategory[] = [
  {
    category: 'New Arrival',
    prompts: [
      'Someone unexpected arrives on the scene, with their own agenda.',
      'A stranger has been watching and now makes themselves known.',
      'Reinforcements arrive — but not for the party.',
    ],
  },
  {
    category: 'Complication',
    prompts: [
      'A resource the party was counting on is unavailable or already spent.',
      'The plan works, but at a cost nobody anticipated.',
      'Something the party assumed was true turns out to be wrong.',
    ],
  },
  {
    category: 'Environmental Shift',
    prompts: [
      'The weather, light, or terrain changes in a way that matters.',
      'A structure, path, or exit becomes unstable or blocked.',
      'A sound, smell, or sensation signals something changing nearby.',
    ],
  },
  {
    category: 'NPC Reaction',
    prompts: [
      'An NPC reacts more strongly than expected — for good or ill.',
      'An NPC reveals a personal stake in what is happening.',
      "An NPC does something that changes the party's trust in them.",
    ],
  },
  {
    category: 'Discovery',
    prompts: [
      'The party notices something they missed the first time.',
      'A clue surfaces that reframes the current situation.',
      'Something valuable or dangerous is found where least expected.',
    ],
  },
  {
    category: 'Reversal',
    prompts: [
      'What seemed safe turns out to be a threat.',
      'What seemed hostile turns out to want the same thing as the party.',
      'The advantage the party held is suddenly lost.',
    ],
  },
];

function pick<T>(table: T[]): T {
  return table[Math.floor(Math.random() * table.length)];
}

async function handleRollComplication(args: Record<string, unknown>): Promise<MCPToolResult> {
  const entry = pick(COMPLICATION_TABLE);
  const prompt = pick(entry.prompts);
  const reason = typeof args.reason === 'string' ? args.reason : undefined;

  return {
    content: `Complication rolled (${entry.category}): ${prompt}`,
    data: { category: entry.category, prompt, reason: reason ?? null },
  };
}

/** Register the roll-complication tool with the MCP server */
export function registerRollComplicationTool(): void {
  registerTool(rollComplicationDefinition, handleRollComplication);
}
