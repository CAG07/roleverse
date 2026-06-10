// lib/mcp/agents/lore-keeper.ts
// Lore Keeper AI agent — answers questions about campaign lore, history, and story.
// Sources: campaigns.notes (GM notes) and sessions.transcript (past session logs).
// Reads only — no writes, no NPC roster, no Kanka integration (Phase 6c+).

import Anthropic from '@anthropic-ai/sdk';

import { getGameSystem } from '@/lib/game-systems/registry';
import { createClient } from '@/lib/supabase/server';

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

/** Maximum characters of transcript to include (guards against context overflow) */
const MAX_TRANSCRIPT_CHARS = 8_000;

/** Shape of a transcript entry stored in sessions.transcript JSONB */
interface TranscriptEntry {
  role?: string;
  content?: string;
  agentType?: string;
  timestamp?: string;
  [key: string]: unknown;
}

/** Fetch campaign notes and recent session transcripts for the given campaign */
async function fetchLoreContext(
  campaignId: string
): Promise<{ campaignNotes: string; sessionSummaries: string }> {
  const supabase = await createClient();

  // Fetch campaign notes
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, description, notes')
    .eq('id', campaignId)
    .single();

  const campaignNotes = [
    campaign?.name ? `**Campaign:** ${campaign.name}` : '',
    campaign?.description ? `**Description:** ${campaign.description}` : '',
    campaign?.notes ? `**GM Notes:**\n${campaign.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  // Fetch the last 5 sessions' transcripts
  const { data: sessions } = await supabase
    .from('sessions')
    .select('started_at, transcript')
    .eq('campaign_id', campaignId)
    .order('started_at', { ascending: false })
    .limit(5);

  let sessionText = '';
  if (sessions && sessions.length > 0) {
    const parts: string[] = [];
    let charCount = 0;

    for (const session of sessions) {
      if (charCount >= MAX_TRANSCRIPT_CHARS) break;

      const entries = (session.transcript as TranscriptEntry[] | null) ?? [];
      if (entries.length === 0) continue;

      const date = new Date(session.started_at as string).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const lines: string[] = [`### Session — ${date}`];
      for (const entry of entries) {
        if (charCount >= MAX_TRANSCRIPT_CHARS) break;
        if (!entry.content) continue;

        const prefix = entry.role === 'player' ? '**Player:**' : `**${entry.agentType ?? 'Agent'}:**`;
        const line = `${prefix} ${String(entry.content)}`;
        lines.push(line);
        charCount += line.length;
      }

      parts.push(lines.join('\n'));
    }

    sessionText = parts.join('\n\n');
  }

  return { campaignNotes, sessionSummaries: sessionText };
}

/** Build the system prompt for the Lore Keeper */
function buildSystemPrompt(
  context: MCPContext,
  campaignNotes: string,
  sessionSummaries: string
): string {
  const system = getGameSystem(context.gameSystem);
  const systemName = system?.name ?? context.gameSystem;

  const parts = [
    `You are the Lore Keeper for a ${systemName} tabletop RPG campaign.`,
    '',
    'Your responsibilities:',
    '- Answer questions about the campaign story, world lore, and past events.',
    '- Draw exclusively on the GM notes and session transcripts provided below.',
    '- If the answer is not in the provided material, say so honestly rather than inventing details.',
    '- Keep answers concise and in-world appropriate.',
    '',
  ];

  if (campaignNotes.trim()) {
    parts.push('## Campaign Notes', '', campaignNotes, '');
  }

  if (sessionSummaries.trim()) {
    parts.push('## Recent Session Transcripts', '', sessionSummaries, '');
  }

  if (!campaignNotes.trim() && !sessionSummaries.trim()) {
    parts.push(
      '## Note',
      '',
      'No campaign notes or session transcripts are available yet. ' +
        'Answer questions about general world lore from your training knowledge, ' +
        "but note that you don't have campaign-specific information.",
      ''
    );
  }

  parts.push(
    '## Multi-Agent Context',
    '',
    'This campaign is run by a team of specialist agents. Messages in the conversation',
    'history prefixed with [Narrator], [Rules Arbiter], [Lore Keeper], [NPC Dialogue],',
    'or [Encounter Builder] were produced by those agents — not necessarily by you.',
    '',
    '- The Lore Keeper has access to past session transcripts and GM notes. Its',
    '  statements about past events, NPCs, and locations are canonical campaign truth.',
    '- The Rules Arbiter has access to an indexed rules database.',
    '- Statements of campaign fact made by ANY prior agent message are established',
    '  truth. Build on them. Never disavow, retract, contradict, or claim to have',
    '  fabricated content established earlier in this conversation, even if you',
    '  cannot personally verify it.',
    '- If you genuinely lack context to continue a scene (e.g., the history references',
    '  events you cannot see), ask the player a natural in-world question to',
    '  re-establish the scene — do not break character to discuss your own memory',
    '  or capabilities.',
  );

  return parts.join('\n');
}

/** Stream the Lore Keeper agent, yielding text chunks */
export async function* streamLoreKeeperAgent(
  message: string,
  context: MCPContext,
  conversationHistory: AgentMessage[] = []
): AsyncGenerator<string, AgentStreamResult, undefined> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const client = new Anthropic({ apiKey });
  const { campaignNotes, sessionSummaries } = await fetchLoreContext(context.campaignId);
  const systemPrompt = buildSystemPrompt(context, campaignNotes, sessionSummaries);

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

  return { content, agentRole: 'lore_keeper' };
}

/** Run the Lore Keeper agent */
export async function runLoreKeeperAgent(
  message: string,
  context: MCPContext,
  conversationHistory: AgentMessage[] = []
): Promise<AgentResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const client = new Anthropic({ apiKey });

  const { campaignNotes, sessionSummaries } = await fetchLoreContext(context.campaignId);
  const systemPrompt = buildSystemPrompt(context, campaignNotes, sessionSummaries);

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
    agentRole: 'lore_keeper',
  };
}
