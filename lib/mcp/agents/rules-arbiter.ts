// lib/mcp/agents/rules-arbiter.ts
// Rules Arbiter AI agent — answers rules questions using RAG-retrieved context.
// Uses the match_rules_embeddings Supabase function to retrieve relevant rule text,
// then passes it as context to Claude for authoritative rule rulings.

import Anthropic from '@anthropic-ai/sdk';

import { getGameSystem } from '@/lib/game-systems/registry';
import { embedText } from '@/lib/rag/embed';
import type { RulesMatchResult } from '@/lib/rag/types';
import { createClient } from '@/lib/supabase/server';

import type { AgentMessage, AgentResponse, MCPContext } from '../types';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;

/** Minimum similarity score to include a retrieved chunk as context */
const MIN_SIMILARITY = 0.5;
/** Maximum number of chunks to retrieve */
const MATCH_COUNT = 8;

/** Build the system prompt for the Rules Arbiter */
function buildSystemPrompt(context: MCPContext, ragContext: string): string {
  const system = getGameSystem(context.gameSystem);
  const systemName = system?.name ?? context.gameSystem;
  const rulesPrompt = system?.rulesPrompt ?? '';
  const isOsricFallback = context.gameSystem === 'ADD2E' && ragContext.includes('OSRIC content');

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

  return parts.join('\n');
}

/** Query Supabase for semantically similar rules chunks */
async function retrieveRulesContext(
  question: string,
  context: MCPContext
): Promise<{ ragContext: string; matchCount: number }> {
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(question);
  } catch {
    // If embedding fails (e.g., no API key), fall back gracefully
    return { ragContext: '', matchCount: 0 };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('match_rules_embeddings', {
    query_embedding: queryEmbedding,
    query_game_system: context.gameSystem,
    query_campaign_id: context.campaignId ?? null,
    match_threshold: MIN_SIMILARITY,
    match_count: MATCH_COUNT,
  });

  if (error || !data) {
    // Non-fatal: proceed without RAG context
    console.warn('Rules Arbiter: match_rules_embeddings failed:', error?.message);
    return { ragContext: '', matchCount: 0 };
  }

  const results = (data as RulesMatchResult[]).sort((a, b) => b.similarity - a.similarity);

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
