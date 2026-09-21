// lib/oracle/consult-oracle.ts
// "My Oracle" — a one-shot, server-side Claude call that answers a player's
// question by consulting ONLY their own uploaded oracle-system reference
// (see lib/oracle/ingest-oracle-ref.ts). This is NOT a session agent: it is
// never registered in lib/mcp/coordinator.ts, never routed through
// routeMessage(), and AgentRole (the closed 3-value union the coordinator
// routes against — game_master/rules_arbiter/lore_keeper) is untouched by
// this file. It lives here, not under lib/mcp/agents/, specifically to keep
// that boundary unambiguous — see .claude/commands/agent-routing.md's
// "three is final" invariant.
//
// Grounding is mandatory: this never answers beyond what was actually
// retrieved from the player's own upload, and says so plainly rather than
// inventing a rule, table value, or probability when the upload doesn't
// cover the question. It must never attribute a result to "Mythic" or any
// other named system unless that system is literally what the player
// uploaded.
import Anthropic from '@anthropic-ai/sdk';
import { searchCampaignPriorityContent, type CampaignPriorityMatch } from '@/lib/rag/search-campaign-priority';
import { parseDiceNotation, rollDice } from '@/lib/mcp/tools/roll-dice';

/** Rolling-daily-cap on BYOO consultations (real Anthropic API cost, unlike
 *  the built-in Flux Oracle, which is free/local and uncapped). Tunable. */
export const MAX_ORACLE_CONSULTS_PER_DAY = 20;

// Covers both "nothing has been uploaded at all" and "something is uploaded
// but nothing relevant enough was retrieved for this specific question" —
// searchCampaignPriorityContent can return zero matches in either case
// (e.g. the question just doesn't clear minSimilarity against an otherwise
// real, indexed reference), so a message that only names the first case
// would be misleading in the second.
export const NO_REFERENCE_MESSAGE =
  'No relevant excerpts were retrieved from your uploaded oracle references. If you haven\'t ' +
  'uploaded and indexed an oracle reference yet, add one under "Manage Oracle References" ' +
  '(e.g. your own copy of Mythic Game Master Emulator, or any other solo-play oracle system) ' +
  '— or use Quick Oracle instead, RoleVerse\'s built-in instant option. Otherwise, try ' +
  'rephrasing your question to better match the text in your reference.';

/** Max rounds of tool-use before forcing a final text turn — bounded and
 *  narrow (answer one question, roll 0-2 times) unlike the GM's open-ended loop. */
const MAX_TOOL_ROUNDS = 3;
const MAX_TOKENS = 1024;

function getRequiredModel(): string {
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) throw new Error('ANTHROPIC_MODEL environment variable is required');
  return model;
}

const ORACLE_ROLL_TOOL: Anthropic.Messages.Tool = {
  name: 'oracleRoll',
  description:
    "Roll dice exactly as the player's uploaded oracle reference specifies. Never state a " +
    'die result without actually calling this tool.',
  input_schema: {
    type: 'object',
    properties: {
      notation: { type: 'string', description: 'Dice notation, e.g. "1d100", "2d10", "1d20+2"' },
      reason: { type: 'string', description: 'What this roll is for, per the retrieved rules' },
    },
    required: ['notation'],
  },
};

export interface UsedRoll {
  notation: string;
  rolls: number[];
  total: number;
  reason?: string;
}

export interface OracleConsultResult {
  answer: string;
  groundedChunks: number;
  usedRolls: UsedRoll[];
}

function buildSystemPrompt(retrievedText: string, oracleState: string | null): string {
  return [
    "You are helping a solo tabletop RPG player consult THEIR OWN uploaded oracle/solo-play system reference — not a general tabletop rules system, whatever specific oracle system they personally uploaded (could be Mythic Game Master Emulator, Ask the Oracle, a homebrew system, or anything else).",
    '',
    'Retrieved excerpts from the player\'s own uploaded reference:',
    '"""',
    retrievedText,
    '"""',
    '',
    `Current player-maintained oracle state notes (in whatever terms their system uses, may be empty): ${oracleState?.trim() || '(none provided)'}`,
    '',
    'Rules you must follow:',
    '- Answer ONLY using the retrieved excerpts above, the question, and the oracle state notes. Do not use outside knowledge of any oracle system, even if you recognize which one this is.',
    '- If the retrieved excerpts do not clearly cover how to resolve this specific question, say so plainly (e.g. "Your uploaded reference doesn\'t clearly cover this case — here\'s what it does say: ...") rather than inventing a rule, table value, or probability.',
    '- If the retrieved rules call for a dice roll, use the oracleRoll tool to actually make it — never state a die result without rolling.',
    '- Never attribute your answer to "Mythic" or any other named system unless that is literally and verifiably what the player uploaded.',
    '- Report only the mechanical oracle result and what it means per the retrieved rules. Do not narrate story action on the player\'s behalf — that stays theirs.',
    '- Be concise.',
  ].join('\n');
}

/**
 * Retrieval only — deliberately separate from runOracleConsult so the API
 * route can check for a total miss BEFORE consuming the daily rate limit or
 * spending any Anthropic API cost. Calling this first and consuming the
 * limit only when it returns matches is what keeps a knowably-empty
 * consultation free.
 */
export async function retrieveOracleContext(
  campaignId: string,
  question: string
): Promise<CampaignPriorityMatch[]> {
  return searchCampaignPriorityContent(question, {
    campaignId,
    sourceTypes: ['oracle_ref'],
  });
}

/**
 * Consult the player's own uploaded oracle reference, given already-fetched
 * retrieval matches (see retrieveOracleContext — callers must check for a
 * zero-match result themselves before calling this, so the rate limit is
 * only consumed once a real Claude call is about to happen).
 */
export async function runOracleConsult(params: {
  matches: CampaignPriorityMatch[];
  question: string;
  oracleState: string | null;
}): Promise<OracleConsultResult> {
  const { matches, question, oracleState } = params;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set');

  const retrievedText = matches.map((m) => m.content).join('\n\n---\n\n');
  const systemPrompt = buildSystemPrompt(retrievedText, oracleState);
  const client = new Anthropic({ apiKey });
  const usedRolls: UsedRoll[] = [];

  const messages: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: question }];

  let response = await client.messages.create({
    model: getRequiredModel(),
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    tools: [ORACLE_ROLL_TOOL],
    tool_choice: { type: 'auto' },
    messages,
  });

  let rounds = 0;
  while (response.stop_reason === 'tool_use' && rounds < MAX_TOOL_ROUNDS) {
    rounds++;
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
    );
    const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      if (block.name !== 'oracleRoll') {
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: 'Unknown tool.',
          is_error: true,
        });
        continue;
      }
      const input = block.input as Record<string, unknown>;
      const notation = typeof input.notation === 'string' ? input.notation : '';
      const reason = typeof input.reason === 'string' ? input.reason : undefined;
      try {
        const dice = parseDiceNotation(notation);
        const result = rollDice(dice);
        usedRolls.push({ notation: dice.notation, rolls: result.rolls, total: result.total, reason });
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: `Rolled ${dice.notation}: [${result.rolls.join(', ')}] = ${result.total}`,
        });
      } catch (err) {
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: err instanceof Error ? err.message : 'Invalid dice notation.',
          is_error: true,
        });
      }
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResultBlocks });

    response = await client.messages.create({
      model: getRequiredModel(),
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: [ORACLE_ROLL_TOOL],
      tool_choice: rounds >= MAX_TOOL_ROUNDS ? { type: 'none' } : { type: 'auto' },
      messages,
    });
  }

  const textBlocks = response.content.filter(
    (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
  );
  const answer = textBlocks.map((b) => b.text).join('\n').trim();

  return {
    answer: answer || "The oracle didn't return a clear answer — try rephrasing your question.",
    groundedChunks: matches.length,
    usedRolls,
  };
}
