// lib/mcp/agents/npc-dialogue.ts
// NPC Dialogue AI agent — generates in-character NPC speech and reactions.
// Phase 6c: Roster-aware. Loads campaign NPCs, includes matched ones in context,
// and emits structured [NPC_PROPOSAL_START]...[NPC_PROPOSAL_END] blocks when proposing changes.

import Anthropic from '@anthropic-ai/sdk';

import { getGameSystem } from '@/lib/game-systems/registry';
import { createClient } from '@/lib/supabase/server';

import type { AgentMessage, AgentResponse, AgentStreamResult, MCPContext } from '../types';
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
    '  "to" is ALWAYS required. NEVER emit null for "to" or "roll_required" — omit "roll_required" entirely when no roll is needed.',
    '  Example (no roll): { "kind": "disposition_shift", "npc_id": "<uuid>", "npc_name": "Pip", "disposition_change": { "from": "neutral", "to": "friendly", "reason": "The party shared their meal and treated Pip with genuine kindness." } }',
    '  Example (contested, roll required): { "kind": "disposition_shift", "npc_id": "<uuid>", "npc_name": "Pip", "disposition_change": { "from": "neutral", "to": "wary", "reason": "The party made a threatening remark.", "roll_required": { "stat": "Charisma", "dc": 12, "outcome_on_success": "neutral", "outcome_on_failure": "wary" } } }',
    '',
    'Do NOT propose new_npc — that is handled by the session extraction tool.',
    'Do NOT propose changes for NPCs not in the roster.',
    'If no change is warranted, omit the proposal block entirely.',
    '',
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

/** Stream the NPC Dialogue agent, yielding text chunks */
export async function* streamNpcDialogueAgent(
  message: string,
  context: MCPContext,
  conversationHistory: AgentMessage[] = []
): AsyncGenerator<string, AgentStreamResult, undefined> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set');

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

  return { content, agentRole: 'npc_dialogue' };
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
