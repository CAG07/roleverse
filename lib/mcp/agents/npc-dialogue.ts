// lib/mcp/agents/npc-dialogue.ts
// NPC Dialogue AI agent — generates in-character NPC speech and reactions.
// Stateless in Phase 6b: no NPC roster, no persistence, no disposition tracking.
// The player or GM provides NPC details in their message.

import Anthropic from '@anthropic-ai/sdk';

import { getGameSystem } from '@/lib/game-systems/registry';

import type { AgentMessage, AgentResponse, MCPContext } from '../types';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 512;

/** Build the system prompt for the NPC Dialogue agent */
function buildSystemPrompt(context: MCPContext): string {
  const system = getGameSystem(context.gameSystem);
  const systemName = system?.name ?? context.gameSystem;

  return [
    `You are the NPC Dialogue agent for a ${systemName} tabletop RPG session.`,
    '',
    'Your responsibilities:',
    '- Voice NPCs in-character based on details provided in the player or GM message.',
    '- Match the NPC\'s personality, knowledge, and speech patterns as described.',
    '- Keep NPC responses brief (2–4 sentences) unless a longer speech is clearly warranted.',
    '- Write NPC dialogue in first person, enclosed in quotation marks.',
    '- Follow the dialogue with a brief bracketed stage direction if the NPC has a notable reaction.',
    '- Never break character or explain your reasoning — just deliver the dialogue.',
    '- If no NPC details are given, ask the GM to describe the NPC first.',
    '',
    'Format example:',
    '"That sword belonged to my grandfather. I\'ll not part with it for any price." ' +
      '[The innkeeper crosses her arms and looks away.]',
  ].join('\n');
}

/** Run the NPC Dialogue agent */
export async function runNpcDialogueAgent(
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
    agentRole: 'npc_dialogue',
  };
}
