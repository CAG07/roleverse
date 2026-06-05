// app/api/campaigns/[id]/sessions/[sessionId]/extract-npcs/route.ts
// POST /api/campaigns/[id]/sessions/[sessionId]/extract-npcs
// Manually triggered — extracts proposed NPCs from a session transcript.
// Returns { proposals: NpcProposal[] }. Does NOT write to the npcs table.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

import { createClient } from '@/lib/supabase/server';
import type { Npc, NpcKnownFact, NpcProposal } from '@/lib/types/npc';

type RouteParams = { params: Promise<{ id: string; sessionId: string }> };

interface TranscriptEntry {
  role?: string;
  content?: string;
  agentType?: string;
  timestamp?: string;
}

function getRequiredHaikuModel(): string {
  const model = process.env.ANTHROPIC_HAIKU_MODEL;
  if (!model) throw new Error('ANTHROPIC_HAIKU_MODEL environment variable is required');
  return model;
}

const HAIKU_MODEL = getRequiredHaikuModel();

const EXTRACTION_SYSTEM_PROMPT = `You are an NPC extractor for a tabletop RPG assistant.
Given a session transcript, identify named NPCs (non-player characters) and return a JSON array of proposals.

Rules:
- Only extract named NPCs — characters with actual names or clear titles (e.g., "Sheriff Marcus", "the innkeeper Marta").
- Do NOT extract player characters (the user's own characters who are taking actions).
- Do NOT extract generic unnamed characters ("a guard", "some bandits") unless they were given a name.
- For each NPC, propose either "new_npc" (not in the existing roster) or "append_facts" (already known).
- Limit to the 10 most significant NPCs, ranked by how central they were to the session.
- Return ONLY valid JSON — no explanation, no markdown, no commentary.

Response format (JSON array):
[
  {
    "kind": "new_npc",
    "npc_name": "Rosie Greenhill",
    "npc_data": {
      "name": "Rosie Greenhill",
      "race": "Halfling",
      "occupation": "Merchant",
      "description": "Brief description from context",
      "personality": "Inferred personality",
      "disposition": "neutral"
    }
  },
  {
    "kind": "append_facts",
    "npc_id": "<existing-npc-uuid>",
    "npc_name": "<existing-npc-name>",
    "facts_to_add": [
      { "fact": "Was told about the cult in Oakenford", "learned_in_session": null, "learned_at": "<ISO timestamp>" }
    ]
  }
]

If no named NPCs appear in the transcript, return an empty array: []`;

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id: campaignId, sessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify campaign ownership
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, owner_id')
    .eq('id', campaignId)
    .single();

  if (!campaign || campaign.owner_id !== user.id) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Verify session belongs to this campaign and user
  const { data: session } = await supabase
    .from('sessions')
    .select('id, transcript')
    .eq('id', sessionId)
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const entries = (session.transcript as TranscriptEntry[] | null) ?? [];
  if (entries.length === 0) {
    return NextResponse.json({ proposals: [] });
  }

  // Build transcript text for extraction
  const transcriptText = entries
    .filter((e) => e.content)
    .map((e) => {
      const speaker = e.role === 'player' ? 'Player' : (e.agentType ?? 'Agent');
      return `${speaker}: ${e.content}`;
    })
    .join('\n');

  // Fetch existing NPCs for cross-referencing
  const { data: existingNpcs } = await supabase
    .from('npcs')
    .select('id, name, known_facts')
    .eq('campaign_id', campaignId);

  const rosterContext =
    existingNpcs && existingNpcs.length > 0
      ? `\n\nExisting NPC roster (case-insensitive name match):\n${(existingNpcs as Pick<Npc, 'id' | 'name' | 'known_facts'>[])
          .map((n) => `- "${n.name}" (id: ${n.id})`)
          .join('\n')}\n\nFor NPCs in this roster, use "append_facts" with the correct npc_id.\nFor NPCs not in this roster, use "new_npc".`
      : '\n\nNo existing NPC roster — all extracted NPCs should be "new_npc".';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });
  const now = new Date().toISOString();

  let proposals: NpcProposal[] = [];

  try {
    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2048,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Current time: ${now}${rosterContext}\n\nSession transcript:\n${transcriptText}`,
        },
      ],
    });

    const rawText = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    // Parse defensively
    const parsed = JSON.parse(rawText) as unknown;
    if (!Array.isArray(parsed)) {
      proposals = [];
    } else {
      proposals = parsed.slice(0, 10).filter(
        (p): p is NpcProposal =>
          typeof p === 'object' &&
          p !== null &&
          typeof (p as Record<string, unknown>).kind === 'string' &&
          ['new_npc', 'append_facts'].includes((p as Record<string, unknown>).kind as string)
      );

      // Inject session ID into any facts_to_add entries that have null learned_in_session
      proposals = proposals.map((proposal) => {
        if (proposal.kind === 'append_facts' && proposal.facts_to_add) {
          return {
            ...proposal,
            facts_to_add: proposal.facts_to_add.map((f: NpcKnownFact) => ({
              ...f,
              learned_in_session: f.learned_in_session ?? sessionId,
              learned_at: f.learned_at ?? now,
            })),
          };
        }
        return proposal;
      });
    }
  } catch (err) {
    console.error('[extract-npcs] Extraction failed:', err);
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }

  return NextResponse.json({ proposals });
}
