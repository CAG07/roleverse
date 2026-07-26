// lib/mcp/agents/lore-keeper.ts
// Lore Keeper AI agent — answers questions about campaign lore, history, and story.
// Sources: campaigns.notes (GM notes) and sessions.transcript (past session logs).
// Reads only — no writes, no NPC roster, no Kanka integration (Phase 6c+).

import Anthropic from '@anthropic-ai/sdk';

import { getGameSystem } from '@/lib/game-systems/registry';
import { createClient } from '@/lib/supabase/server';
import { tailExcerpt, type TranscriptEntryLike } from '@/lib/sessions/transcript-excerpt';
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

/** How many past ended sessions to pull summaries for */
const MAX_ENDED_SESSIONS = 5;

/** Per-session fallback budget when an ended session has no summary yet */
const FALLBACK_TAIL_CHARS = 4_000;

/** Overall character budget for the ended-session section (summaries + fallback excerpts combined) */
const MAX_ENDED_SESSIONS_CHARS = 12_000;

/** Budget for the currently active (unended, un-summarized) session's tail */
const ACTIVE_SESSION_TAIL_CHARS = 6_000;

/** Shape of a transcript entry stored in sessions.transcript JSONB */
type TranscriptEntry = TranscriptEntryLike & { timestamp?: string; [key: string]: unknown };

/** Fetch campaign notes and recent session transcripts for the given campaign */
async function fetchLoreContext(
  campaignId: string
): Promise<{ campaignNotes: string; sessionSummaries: string }> {
  const supabase = await createClient();

  // Fetch campaign notes
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, description, module_description, notes')
    .eq('id', campaignId)
    .single();

  const campaignNotes = [
    campaign?.name ? `**Campaign:** ${campaign.name}` : '',
    campaign?.description ? `**Description:** ${campaign.description}` : '',
    campaign?.module_description ? `**Module / Adventure:** ${campaign.module_description}` : '',
    campaign?.notes ? `**GM Notes:**\n${campaign.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const parts: string[] = [];
  let endedSessionsCharCount = 0;

  // Past ended sessions: prefer the stored summary (concise, reliable, and — per
  // generate-summary.ts — always closes with exactly where the party left off).
  // Only fall back to a raw transcript excerpt when no summary was ever written
  // (an older session, or a past failure) — and even then, take the END of that
  // session's transcript, not the beginning, since that's the part that answers
  // "where did we leave off."
  // An overall budget (MAX_ENDED_SESSIONS_CHARS) prevents arbitrarily long
  // summaries from inflating prompt size when many sessions have been played.
  const { data: endedSessions } = await supabase
    .from('sessions')
    .select('started_at, ended_at, summary, transcript')
    .eq('campaign_id', campaignId)
    .not('ended_at', 'is', null)
    .order('ended_at', { ascending: false })
    .limit(MAX_ENDED_SESSIONS);

  for (const session of endedSessions ?? []) {
    if (endedSessionsCharCount >= MAX_ENDED_SESSIONS_CHARS) break;

    const date = formatDate(session.started_at as string);
    const summary = (session.summary as string | null | undefined) ?? null;

    if (summary) {
      const remaining = MAX_ENDED_SESSIONS_CHARS - endedSessionsCharCount;
      const truncated = summary.length > remaining ? summary.slice(0, remaining) : summary;
      parts.push(`### Session — ${date} (summary)\n${truncated}`);
      endedSessionsCharCount += truncated.length;
      continue;
    }

    const entries = (session.transcript as TranscriptEntry[] | null) ?? [];
    if (entries.length === 0) continue;
    const remaining = Math.min(FALLBACK_TAIL_CHARS, MAX_ENDED_SESSIONS_CHARS - endedSessionsCharCount);
    const excerpt = tailExcerpt(entries, remaining);
    if (excerpt) {
      parts.push(`### Session — ${date} (no summary available — most recent portion)\n${excerpt}`);
      endedSessionsCharCount += excerpt.length;
    }
  }

  // Currently active session, if any: has no summary by definition, so include
  // the most recent portion of its raw transcript for "what just happened" questions.
  const { data: activeSession } = await supabase
    .from('sessions')
    .select('started_at, transcript')
    .eq('campaign_id', campaignId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSession) {
    const entries = (activeSession.transcript as TranscriptEntry[] | null) ?? [];
    if (entries.length > 0) {
      const excerpt = tailExcerpt(entries, ACTIVE_SESSION_TAIL_CHARS);
      if (excerpt) {
        const date = formatDate(activeSession.started_at as string);
        parts.push(`### Current Session — ${date} (in progress)\n${excerpt}`);
      }
    }
  }

  return { campaignNotes, sessionSummaries: parts.join('\n\n') };
}

/** Build the system prompt for the Lore Keeper */
function buildSystemPrompt(
  context: MCPContext,
  campaignNotes: string,
  sessionSummaries: string,
  partyContext: string | null
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

  if (partyContext) {
    parts.push(partyContext, '');
  }

  parts.push(
    ...getMultiAgentContextSection({
      includeCampaignLine: false,
      additionalHistoryLine:
        '(and transcript lines labeled game_master/rules_arbiter/lore_keeper)',
      continuityLines: [
        '- For current-scene continuity, treat prior agent messages in this conversation as the established scene state.',
        '- For questions about past sessions / campaign lore, ONLY treat the GM notes and session transcripts above as canonical.',
        '  If something is not in them, say so rather than asserting it as fact.',
      ],
    })
  );

  return parts.join('\n');
}

/** Stream the Lore Keeper agent, yielding text chunks */
export async function* streamLoreKeeperAgent(
  message: string,
  context: MCPContext,
  conversationHistory: AgentMessage[] = [],
  partyContext: string | null = null
): AsyncGenerator<string, AgentStreamResult, undefined> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const client = new Anthropic({ apiKey });
  const { campaignNotes, sessionSummaries } = await fetchLoreContext(context.campaignId);
  const systemPrompt = buildSystemPrompt(context, campaignNotes, sessionSummaries, partyContext);

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
  conversationHistory: AgentMessage[] = [],
  partyContext: string | null = null
): Promise<AgentResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const client = new Anthropic({ apiKey });

  const { campaignNotes, sessionSummaries } = await fetchLoreContext(context.campaignId);
  const systemPrompt = buildSystemPrompt(context, campaignNotes, sessionSummaries, partyContext);

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
