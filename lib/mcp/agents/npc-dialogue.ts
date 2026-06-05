// lib/mcp/agents/npc-dialogue.ts
// NPC Dialogue AI agent — generates in-character NPC speech and reactions.
// Phase 6c: Roster-aware. Loads campaign NPCs, includes matched ones in context,
// and emits structured [NPC_PROPOSAL_START]...[NPC_PROPOSAL_END] blocks when proposing changes.

import Anthropic from '@anthropic-ai/sdk';

import { getGameSystem } from '@/lib/game-systems/registry';
import { createClient } from '@/lib/supabase/server';

import type { AgentMessage, AgentResponse, MCPContext } from '../types';
import type { Npc, NpcKnownFact } from '@/lib/types/npc';

function getRequiredModel(): string {
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) throw new Error('ANTHROPIC_MODEL environment variable is required');
  return model;
}

const MODEL = getRequiredModel();
const MAX_TOKENS = 768;
const MAX_FACTS_IN_PROMPT = 5;

/** Fetch all NPCs for the campaign */
async function fetchCampaignNpcs(campaignId: string): Promise<Npc[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('npcs')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('name', { ascending: true });
  return (data as Npc[]) ?? [];
}

/** Return NPCs whose names appear (case-insensitive) in the given text */
function findMentionedNpcs(text: string, npcs: Npc[]): Npc[] {
  return npcs.filter((npc) => {
    const name = npc.name.toLowerCase().trim();
    if (!name) return false;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    return re.test(text);
  });
}

/** Format an NPC record for inclusion in the system prompt */
function formatNpcForPrompt(npc: Npc): string {
  const lines: string[] = [`### ${npc.name}`];
  const meta: string[] = [];
  if (npc.race) meta.push(`Race: ${npc.race}`);
  if (npc.occupation) meta.push(`Occupation: ${npc.occupation}`);
  if (meta.length > 0) lines.push(meta.join(' | '));
  lines.push(`Disposition: ${npc.disposition}`);
  if (npc.current_location) lines.push(`Current location: ${npc.current_location}`);
  if (npc.description) lines.push(`Description: ${npc.description}`);
  if (npc.personality) lines.push(`Personality: ${npc.personality}`);
  if (npc.voice_notes) lines.push(`Voice notes: ${npc.voice_notes}`);

  const facts = (npc.known_facts as NpcKnownFact[]) ?? [];
  if (facts.length > 0) {
    const recent = facts.slice(-MAX_FACTS_IN_PROMPT).reverse();
    lines.push(
      `Known facts (most recent first):\n${recent.map((f) => `  - ${f.fact}`).join('\n')}`
    );
  }

  return lines.join('\n');
}

/** Build the system prompt, optionally including matched NPC context */
function buildSystemPrompt(context: MCPContext, matchedNpcs: Npc[]): string {
  const system = getGameSystem(context.gameSystem);
  const systemName = system?.name ?? context.gameSystem;

  const parts: string[] = [
    `You are the NPC Dialogue agent for a ${systemName} tabletop RPG session.`,
    '',
    'Your responsibilities:',
    '- Voice NPCs in-character based on their profiles and any details provided.',
    '- Match the NPC\'s personality, knowledge, and speech patterns as described.',
    '- Keep NPC responses brief (2–4 sentences) unless a longer speech is clearly warranted.',
    '- Write NPC dialogue in first person, enclosed in quotation marks.',
    '- Follow the dialogue with a brief bracketed stage direction if the NPC has a notable reaction.',
    '- Never break character or explain your reasoning — just deliver the dialogue.',
    '- If no NPC details are given and no matching NPC is in the roster, ask the GM to describe the NPC first.',
    '',
    'Format example:',
    '"That sword belonged to my grandfather. I\'ll not part with it for any price." ' +
      '[The innkeeper crosses her arms and looks away.]',
  ];

  if (matchedNpcs.length > 0) {
    parts.push(
      '',
      '## Known NPCs in this scene',
      '',
      matchedNpcs.map(formatNpcForPrompt).join('\n\n'),
      ''
    );
  }

  parts.push(
    '',
    '## Proposing NPC updates',
    '',
    'After your in-character response, you MAY propose one NPC change using this exact format:',
    '',
    '[NPC_PROPOSAL_START]',
    '{ "kind": "append_facts" | "disposition_shift", ... }',
    '[NPC_PROPOSAL_END]',
    '',
    'Only propose when:',
    '- append_facts: The player revealed durable information the NPC didn\'t previously know.',
    '  Example: { "kind": "append_facts", "npc_id": "<uuid>", "facts_to_add": [{ "fact": "...", "learned_in_session": null, "learned_at": "<ISO>" }] }',
    '',
    '- disposition_shift: The player took an action that meaningfully changed how the NPC perceives the party.',
    '  Include roll_required if the shift is contested (e.g., insulting someone could be brushed off with a good Charisma roll).',
    '  Example: { "kind": "disposition_shift", "npc_id": "<uuid>", "disposition_change": { "from": "neutral", "to": "wary", "reason": "...", "roll_required": { "stat": "Charisma", "dc": 12, "outcome_on_success": "neutral", "outcome_on_failure": "wary" } } }',
    '',
    'Do NOT propose new_npc — that is handled by the session extraction tool.',
    'Do NOT propose changes for NPCs not in the roster.',
    'If no change is warranted, omit the proposal block entirely.'
  );

  return parts.join('\n');
}

/** Run the NPC Dialogue agent */
export async function runNpcDialogueAgent(
  message: string,
  context: MCPContext,
  conversationHistory: AgentMessage[] = []
): Promise<AgentResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set');

  // Load campaign NPCs and find which ones are mentioned in recent context
  const allNpcs = await fetchCampaignNpcs(context.campaignId);
  const recentText = [
    ...conversationHistory.slice(-5).map((m) => m.content),
    message,
  ].join(' ');
  const matchedNpcs = findMentionedNpcs(recentText, allNpcs);

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(context, matchedNpcs);

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
