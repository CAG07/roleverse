// app/api/campaigns/[id]/npcs/generate/route.ts
// POST — AI-generate a premade NPC for this campaign. Returns a draft only;
// nothing is inserted here. The client pre-fills NpcForm's existing local
// state and the player reviews/edits before the form's own unmodified
// POST /api/campaigns/[id]/npcs submit path runs.
//
// This is a one-shot Claude tool-use call — NOT a session agent, and it never
// touches lib/mcp/coordinator.ts's three-role router. The tool's input_schema
// intentionally mirrors FLAG_NPC_TOOL in lib/mcp/agents/game-master.ts (same
// NPC shape, different call site — a live-session flag vs. a form-fill
// utility — so it's defined locally here rather than shared across that
// boundary).

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

import { createClient } from '@/lib/supabase/server';
import type { NpcDisposition } from '@/lib/types/npc';
import { MAX_PREMADE_GENERATIONS } from '@/lib/character/generate-premade';

type RouteParams = { params: Promise<{ id: string }> };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const VALID_DISPOSITIONS: NpcDisposition[] = ['friendly', 'helpful', 'neutral', 'wary', 'hostile'];

function getRequiredModel(): string {
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) throw new Error('ANTHROPIC_MODEL environment variable is required');
  return model;
}

const GENERATE_NPC_TOOL: Anthropic.Messages.Tool = {
  name: 'generateNpc',
  description: 'Generate a complete, evocative premade tabletop RPG NPC.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      race: { type: 'string' },
      occupation: { type: 'string' },
      description: { type: 'string', description: 'Physical appearance and general impression' },
      personality: { type: 'string', description: 'Behavior, quirks, motivations' },
      voice_notes: { type: 'string', description: 'Speech patterns, accent, catchphrases' },
      disposition: { type: 'string', enum: VALID_DISPOSITIONS },
      current_location: { type: 'string' },
    },
    required: ['name'],
  },
};

async function authAndCampaign(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { error: 'Unauthorized', status: 401, user: null, supabase: null };

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, owner_id, npc_generation_count')
    .eq('id', campaignId)
    .single();

  if (!campaign || campaign.owner_id !== user.id) {
    return { error: 'Campaign not found', status: 404, user: null, supabase: null };
  }

  return {
    error: null,
    status: 200,
    user,
    supabase,
    currentCount: (campaign.npc_generation_count as number) ?? 0,
  };
}

/** Soft anti-abuse guard, not a security boundary — fetch-then-conditional-update
 *  is good enough for a single-owner campaign's occasional button clicks. */
async function tryConsumeGeneration(
  supabase: Supabase,
  campaignId: string,
  currentCount: number
): Promise<boolean> {
  if (currentCount >= MAX_PREMADE_GENERATIONS) return false;
  const { data } = await supabase
    .from('campaigns')
    .update({ npc_generation_count: currentCount + 1 })
    .eq('id', campaignId)
    .eq('npc_generation_count', currentCount)
    .select('id');
  return (data?.length ?? 0) > 0;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { error, status, user, supabase, currentCount } = await authAndCampaign(id);

  if (error || !user || !supabase) {
    return NextResponse.json({ error }, { status });
  }

  const consumed = await tryConsumeGeneration(supabase, id, currentCount ?? 0);
  if (!consumed) {
    return NextResponse.json(
      {
        error: `This campaign has reached its limit of ${MAX_PREMADE_GENERATIONS} AI-generated NPCs. Create additional NPCs manually.`,
      },
      { status: 429 }
    );
  }

  let body: { hint?: string };
  try {
    body = (await request.json()) as { hint?: string };
  } catch {
    body = {};
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY environment variable is not set' }, { status: 502 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: getRequiredModel(),
      max_tokens: 512,
      system:
        'You generate evocative, usable tabletop RPG NPCs. Always call the generateNpc tool with ' +
        'your result — do not respond with plain text.',
      tools: [GENERATE_NPC_TOOL],
      tool_choice: { type: 'tool', name: 'generateNpc' },
      messages: [
        {
          role: 'user',
          content: body.hint?.trim()
            ? `Generate a premade NPC: ${body.hint.trim()}`
            : 'Generate an interesting, memorable premade NPC.',
        },
      ],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use' && b.name === 'generateNpc'
    );
    if (!toolUse) throw new Error('NPC generation did not return a result');

    const input = toolUse.input as Record<string, unknown>;
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name) throw new Error('NPC generation did not return a name');

    const npc = {
      name,
      race: typeof input.race === 'string' ? input.race.trim() : '',
      occupation: typeof input.occupation === 'string' ? input.occupation.trim() : '',
      description: typeof input.description === 'string' ? input.description.trim() : '',
      personality: typeof input.personality === 'string' ? input.personality.trim() : '',
      voice_notes: typeof input.voice_notes === 'string' ? input.voice_notes.trim() : '',
      disposition: VALID_DISPOSITIONS.includes(input.disposition as NpcDisposition)
        ? (input.disposition as NpcDisposition)
        : 'neutral',
      current_location: typeof input.current_location === 'string' ? input.current_location.trim() : '',
    };

    return NextResponse.json({ npc });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'NPC generation failed' },
      { status: 502 }
    );
  }
}
