// lib/mcp/agents/encounter-builder.ts
// Encounter Builder AI agent — generates balanced combat encounters inline in chat.
// Stateless in Phase 6b: no encounter persistence, no save/edit UI, no world-building.
// Generates encounters for the current session only.

import Anthropic from '@anthropic-ai/sdk';

import { getGameSystem } from '@/lib/game-systems/registry';

import type { AgentMessage, AgentResponse, MCPContext } from '../types';

function getRequiredModel(): string {
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) {
    throw new Error('ANTHROPIC_MODEL environment variable is required');
  }
  return model;
}

const MODEL = getRequiredModel();
const MAX_TOKENS = 1024;

/** Build the system prompt for the Encounter Builder */
function buildSystemPrompt(context: MCPContext): string {
  const system = getGameSystem(context.gameSystem);
  const systemName = system?.name ?? context.gameSystem;
  const rulesPrompt = system?.rulesPrompt ?? '';

  return [
    `You are the Encounter Builder for a ${systemName} tabletop RPG session.`,
    rulesPrompt,
    '',
    'Your responsibilities:',
    '- Design balanced, engaging combat encounters based on the GM\'s description.',
    '- State the party composition, difficulty, and environment if not provided, and ask for them.',
    '- List each enemy with: name, quantity, key stats (HP, AC, attack), and notable abilities.',
    '- Include tactical notes: enemy positioning, objectives, terrain features.',
    '- Provide a brief XP / treasure reward appropriate to the system and difficulty.',
    '- Keep the encounter focused on combat — no world-building or dungeon generation.',
    '',
    'Format your response as a structured encounter block with clear sections:',
    '**Encounter: [Name]**',
    '**Difficulty:** [Easy/Medium/Hard/Deadly or system equivalent]',
    '**Environment:** [Location description]',
    '**Enemies:** [List]',
    '**Tactics:** [Notes]',
    '**Rewards:** [XP, treasure, or other rewards]',
  ].join('\n');
}

/** Run the Encounter Builder agent */
export async function runEncounterBuilderAgent(
  message: string,
  context: MCPContext,
  conversationHistory: AgentMessage[] = []
): Promise<AgentResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = buildSystemPrompt(context);

  const messages: Anthropic.Messages.MessageParam[] = [
    ...conversationHistory.map(
      (msg): Anthropic.Messages.MessageParam => ({
        role: msg.role,
        content: msg.content,
      })
    ),
    { role: 'user', content: message },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  const textBlocks = response.content.filter(
    (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
  );
  const content = textBlocks.map((b) => b.text).join('\n');

  return {
    content,
    agentRole: 'encounter_builder',
  };
}
