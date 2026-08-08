// lib/mcp/tools/roll-dice.ts
// Dice-rolling tool for the GM's OWN hidden/procedural rolls — never for a player
// character's action. Skill checks, ability checks, saves, and attacks belong to the
// player: they roll (Fantasy Grounds, physical dice, a digital roller, an oracle, or
// any method they choose — Fantasy Grounds is never required) and report the result
// back for the GM to narrate. Fantasy Grounds also independently handles tactical
// combat rolls when a player has it connected.

import { getGameSystem } from '@/lib/game-systems/registry';
import type { DiceNotation } from '@/lib/game-systems/types';
import { registerTool } from '../server';
import type { MCPContext, MCPToolDefinition, MCPToolResult } from '../types';

/** JSON Schema describing the roll-dice tool's input parameters */
const rollDiceDefinition: MCPToolDefinition = {
  name: 'roll-dice',
  description:
    "Roll dice for the GM's own hidden, behind-the-scenes results — wandering monster " +
    'checks, NPC reaction rolls, morale, weather, treasure generation, and similar GM-side ' +
    "procedural generation. NEVER use this for a player character's skill check, ability " +
    'check, saving throw, or attack roll — those belong to the player. Ask the player to ' +
    'roll and report the result instead; do not roll on their behalf.',
  inputSchema: {
    type: 'object',
    properties: {
      notation: {
        type: 'string',
        description: 'Dice notation string, e.g. "1d20+5", "2d6", "1d100"',
      },
      reason: {
        type: 'string',
        description:
          'Why the roll is being made, e.g. "wandering monster check for this watch" — ' +
          'never a player-character check, which the player rolls themselves',
      },
    },
    required: ['notation'],
  },
};

/** Regex to parse standard dice notation: NdS or NdS+M or NdS-M */
const DICE_RE = /^(\d+)d(\d+)([+-]\d+)?$/i;

/** Parse a dice notation string into a structured DiceNotation object */
export function parseDiceNotation(input: string): DiceNotation {
  const trimmed = input.trim().replace(/\s+/g, '');
  const match = DICE_RE.exec(trimmed);
  if (!match) {
    throw new Error(
      `Invalid dice notation: "${input}". Expected format like "1d20", "2d6+3", "1d100-2".`
    );
  }
  return {
    notation: trimmed.toLowerCase(),
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  };
}

/** Roll a single die with the given number of sides (1-based) */
function rollSingleDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Execute a dice roll from a parsed DiceNotation */
export function rollDice(dice: DiceNotation): { rolls: number[]; total: number } {
  const rolls: number[] = [];
  for (let i = 0; i < dice.count; i++) {
    rolls.push(rollSingleDie(dice.sides));
  }
  const sum = rolls.reduce((a, b) => a + b, 0);
  return { rolls, total: sum + dice.modifier };
}

/** MCP tool handler for roll-dice */
async function handleRollDice(
  args: Record<string, unknown>,
  context: MCPContext
): Promise<MCPToolResult> {
  const notation = args.notation;
  if (typeof notation !== 'string' || notation.trim() === '') {
    return {
      content: '',
      error: 'Missing or invalid "notation" argument. Expected a dice string like "1d20+5".',
    };
  }

  // Validate the game system exists
  const system = getGameSystem(context.gameSystem);
  const systemName = system?.name ?? context.gameSystem;
  const systemId = system?.id ?? context.gameSystem;

  let dice: DiceNotation;
  try {
    dice = parseDiceNotation(notation);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: '', error: message };
  }

  const result = rollDice(dice);

  const reason = typeof args.reason === 'string' ? args.reason : undefined;
  const rollsStr = result.rolls.join(', ');
  const modStr = dice.modifier !== 0 ? ` ${dice.modifier > 0 ? '+' : ''}${dice.modifier}` : '';
  const reasonStr = reason ? ` for ${reason}` : '';

  const content =
    `🎲 Rolled ${dice.notation}${reasonStr} (${systemName}): ` +
    `[${rollsStr}]${modStr} = **${result.total}**`;

  return {
    content,
    data: {
      notation: dice.notation,
      rolls: result.rolls,
      modifier: dice.modifier,
      total: result.total,
      reason: reason ?? null,
      gameSystem: systemId,
    },
  };
}

/** Register the roll-dice tool with the MCP server */
export function registerRollDiceTool(): void {
  registerTool(rollDiceDefinition, handleRollDice);
}
