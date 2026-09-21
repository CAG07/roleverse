// app/api/campaigns/[id]/characters/generate/route.ts
// POST — AI-generate a premade character for this campaign's game system.
// Returns a draft only; nothing is inserted here. The client pre-fills
// NewCharacterForm's existing state and the player reviews/edits before the
// form's own unmodified supabase.from('characters').insert(...) call runs.

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { generatePremadeCharacter, MAX_PREMADE_GENERATIONS } from '@/lib/character/generate-premade';

type RouteParams = { params: Promise<{ id: string }> };
type Supabase = Awaited<ReturnType<typeof createClient>>;

async function authAndCampaign(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401, gameSystem: null, user: null, supabase: null };
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, owner_id, game_system, character_generation_count')
    .eq('id', campaignId)
    .single();

  if (!campaign || campaign.owner_id !== user.id) {
    return { error: 'Campaign not found', status: 404, gameSystem: null, user: null, supabase: null };
  }

  return {
    error: null,
    status: 200,
    gameSystem: campaign.game_system as string,
    user,
    supabase,
    currentCount: (campaign.character_generation_count as number) ?? 0,
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
    .update({ character_generation_count: currentCount + 1 })
    .eq('id', campaignId)
    .eq('character_generation_count', currentCount)
    .select('id');
  return (data?.length ?? 0) > 0;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { error, status, gameSystem, user, supabase, currentCount } = await authAndCampaign(id);

  if (error || !gameSystem || !user || !supabase) {
    return NextResponse.json({ error }, { status });
  }

  const consumed = await tryConsumeGeneration(supabase, id, currentCount ?? 0);
  if (!consumed) {
    return NextResponse.json(
      {
        error: `This campaign has reached its limit of ${MAX_PREMADE_GENERATIONS} AI-generated characters. Create additional characters manually.`,
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

  try {
    const character = await generatePremadeCharacter(gameSystem, body.hint);
    return NextResponse.json({ character });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Character generation failed' },
      { status: 502 }
    );
  }
}
