// lib/mcp/agents/rules-arbiter.ts
// Rules Arbiter AI agent — answers rules questions using RAG-retrieved context.
// Uses the match_rules_embeddings Supabase function to retrieve relevant rule text,
// then passes it as context to Claude for authoritative rule rulings.

import Anthropic from '@anthropic-ai/sdk';

import { getGameSystem } from '@/lib/game-systems/registry';
import { searchRules } from '@/lib/rag/search';
import { getMultiAgentContextSection } from './multi-agent-context';

import type { AgentMessage, AgentResponse, AgentStreamResult, MCPContext } from '../types';

function getRequiredModel(): string {
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) {
    throw new Error('ANTHROPIC_MODEL environment variable is required');
  }
  return model;
}

const MODEL = getRequiredModel();
const MAX_TOKENS = 1024;

/** Build the system prompt for the Rules Arbiter */
function buildSystemPrompt(context: MCPContext, ragContext: string): string {
  const system = getGameSystem(context.gameSystem);
  const systemName = system?.name ?? context.gameSystem;
  const rulesPrompt = system?.rulesPrompt ?? '';
  const isOsricFallback = context.gameSystem === 'ADD2E' && ragContext.toLowerCase().includes('osric');

  const parts = [
    `You are the Rules Arbiter for a ${systemName} tabletop RPG session.`,
    rulesPrompt,
    '',
    'Your responsibilities:',
    '- Answer rules questions accurately and concisely.',
    '- Cite the specific rule or page reference when possible.',
    '- When the answer is ambiguous, present both interpretations and recommend one.',
    '- Never invent rules — if unsure, say so and suggest the GM make a ruling.',
    '',
  ];

  if (ragContext.trim()) {
    parts.push(
      '## Retrieved Rules Context',
      '',
      'The following rules excerpts were retrieved from the indexed rulebook for this game system.',
      'Use them as the primary source of truth when they are relevant. If they do not cover the',
      "question, rely on your training knowledge but note that you're doing so.",
      '',
      ragContext,
      '',
    );
  } else {
    parts.push(
      '## Note on Source Material',
      '',
      isOsricFallback
        ? 'No indexed rules text was found for this query. AD&D 2E rules content is not yet fully ' +
          'indexed — rely on your training knowledge of AD&D 2E and OSRIC for this answer, and note ' +
          'that you are doing so.'
        : 'No indexed rules text was found for this query. Answer from training knowledge and note ' +
          'that you are doing so.',
      '',
    );
  }

  parts.push(...getMultiAgentContextSection());

  return parts.join('\n');
}

/** Retrieve semantically similar rules chunks using the shared search helper and format as context */
async function retrieveRulesContext(
  question: string,
  context: MCPContext
): Promise<{ ragContext: string; matchCount: number }> {
  const results = await searchRules(question, {
    gameSystem: context.gameSystem,
    campaignId: context.campaignId,
  });

  if (results.length === 0) {
    return { ragContext: '', matchCount: 0 };
  }

  // Format retrieved chunks as context blocks
  const contextBlocks = results.map((r) => {
    const title = (r.metadata?.title as string | undefined) ?? '';
    const category = (r.metadata?.category as string | undefined) ?? '';
    const source = (r.metadata?.source as string | undefined) ?? '';
    const header = [title, category, source].filter(Boolean).join(' · ');
    return `### ${header}\n\n${r.content}\n\n*Relevance: ${(r.similarity * 100).toFixed(0)}%*`;
  });

  return {
    ragContext: contextBlocks.join('\n\n---\n\n'),
    matchCount: results.length,
  };
}

/** Stream the Rules Arbiter agent, yielding text chunks */
export async function* streamRulesArbiterAgent(
  message: string,
  context: MCPContext,
  conversationHistory: AgentMessage[] = []
): AsyncGenerator<string, AgentStreamResult, undefined> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const client = new Anthropic({ apiKey });
  const { ragContext, matchCount } = await retrieveRulesContext(message, context);
  const systemPrompt = buildSystemPrompt(context, ragContext);

  const messages: Anthropic.Messages.MessageParam[] = [
    ...conversationHistory.map(
      (msg): Anthropic.Messages.MessageParam => ({
        role: msg.role,
        content: msg.content,
      })
    ),
    { role: 'user', content: message },
  ];

  let content = '';
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
      content += event.delta.text;
    }
  }

  return {
    content,
    agentRole: 'rules_arbiter',
    toolResults: matchCount > 0
      ? [{ content: `Retrieved ${matchCount} rules chunk(s) from index.`, data: { matchCount } }]
      : undefined,
  };
}

/** Run the Rules Arbiter agent against the Claude API */
export async function runRulesArbiterAgent(
  message: string,
  context: MCPContext,
  conversationHistory: AgentMessage[] = []
): Promise<AgentResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const client = new Anthropic({ apiKey });

  // Retrieve relevant rules context via RAG
  const { ragContext, matchCount } = await retrieveRulesContext(message, context);

  const systemPrompt = buildSystemPrompt(context, ragContext);

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
    agentRole: 'rules_arbiter',
    toolResults: matchCount > 0
      ? [{ content: `Retrieved ${matchCount} rules chunk(s) from index.`, data: { matchCount } }]
      : undefined,
  };
}
