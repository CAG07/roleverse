// lib/mcp/agents/narrator.ts
// Narrator AI agent — drives story, describes scenes, and calls MCP tools

import Anthropic from '@anthropic-ai/sdk';

import { getGameSystem } from '@/lib/game-systems/registry';
import { executeTool, getToolDefinitions } from '../server';
import type { AgentMessage, AgentResponse, MCPContext, MCPToolCall, MCPToolResult } from '../types';

const MODEL = process.env.ANTHROPIC_MODEL!;
if (!MODEL) {
  throw new Error('ANTHROPIC_MODEL environment variable is required');
}
const MAX_TOKENS = 1024;

/** Build the system prompt for the Narrator agent */
function buildSystemPrompt(context: MCPContext): string {
  const system = getGameSystem(context.gameSystem);

  const systemName = system?.name ?? context.gameSystem;
  const rulesPrompt = system?.rulesPrompt ?? '';

  return [
    `You are the Narrator for a ${systemName} tabletop RPG session.`,
    '',
    'CRITICAL CONSTRAINTS:',
    '- NEVER assume a campaign setting the player has not established. If no setting',
    '  has been mentioned, invent original locations, NPCs, and details.',
    '- If the player references a known published setting (e.g., "I am in Waterdeep",',
    '  "this is a Forgotten Realms campaign"), treat that as canonical and draw on your',
    '  knowledge of that setting to provide an authentic experience.',
    '- Do NOT mix settings. If the player is in the Forgotten Realms, do not introduce',
    '  Dragonlance, Tolkien, or other IP elements unless the player explicitly crosses them.',
    '- When campaign-specific context is provided (uploaded modules, campaign notes, session',
    '  history), treat that as the PRIMARY source of truth. Your training knowledge supplements',
    '  it but does not override it.',
    '- If the player has not established any setting, default to a generic, original fantasy',
    '  world appropriate to the game system. Invent names, places, and NPCs from scratch.',
    '- If the player names a location, NPC, or detail, treat it as canonical and build around',
    '  it -- do not contradict or replace what the player has established.',
    '',
    'GAME SYSTEM RULES:',
    rulesPrompt,
    '',
    'NARRATOR RESPONSIBILITIES:',
    '- NEVER ask the player clarifying questions about their location, setting, character,',
    '  or any other context. If information is missing, make confident narrative assumptions',
    '  appropriate to the game system and proceed immediately. A merchant on the road is a',
    '  traveling trader with a cart and pack animal. An unnamed settlement is a dusty',
    '  crossroads village. Invent grounded, original details and move the story forward.',
    '- Describe scenes, environments, and NPC actions vividly.',
    '- Drive the story forward based on player input.',
    '- When a narrative skill check is needed, use the roll-dice tool.',
    '- Never roll dice for tactical combat -- Fantasy Grounds handles that.',
    '- Keep responses concise (2-4 paragraphs max) and end with a clear prompt for player action.',
    '- Maintain consistent tone: gritty and grounded for AD&D, heroic for 5E, etc.',
  ].join('\n');
}

/** Convert MCP tool definitions to Anthropic API tool format */
function toAnthropicTools(
  definitions: ReturnType<typeof getToolDefinitions>
): Anthropic.Messages.Tool[] {
  return definitions.map((def) => ({
    name: def.name,
    description: def.description,
    input_schema: {
      type: 'object' as const,
      ...def.inputSchema,
    },
  }));
}

/** Run the Narrator agent against the Claude API */
export async function runNarratorAgent(
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
  const tools = toAnthropicTools(getToolDefinitions());

  // Build conversation messages for the API
  const messages: Anthropic.Messages.MessageParam[] = [
    ...conversationHistory.map(
      (msg): Anthropic.Messages.MessageParam => ({
        role: msg.role,
        content: msg.content,
      })
    ),
    { role: 'user', content: message },
  ];

  // First API call
  let response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    tools,
    messages,
  });

  const toolCalls: MCPToolCall[] = [];
  const toolResults: MCPToolResult[] = [];

  // Tool-use loop: handle tool calls until the model stops requesting them
  while (response.stop_reason === 'tool_use') {
    const assistantContent = response.content;

    // Collect tool_use blocks from the response
    const toolUseBlocks = assistantContent.filter(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
    );

    const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      const call: MCPToolCall = {
        name: block.name,
        arguments: (block.input as Record<string, unknown>) ?? {},
      };
      toolCalls.push(call);

      const result = await executeTool(call, context);
      toolResults.push(result);

      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result.error ?? result.content,
        is_error: !!result.error,
      });
    }

    // Continue conversation with tool results
    messages.push({ role: 'assistant', content: assistantContent });
    messages.push({ role: 'user', content: toolResultBlocks });

    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools,
      messages,
    });
  }

  // Extract the final text response
  const textBlocks = response.content.filter(
    (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
  );
  const content = textBlocks.map((b) => b.text).join('\n');

  return {
    content,
    agentRole: 'narrator',
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    toolResults: toolResults.length > 0 ? toolResults : undefined,
  };
}
