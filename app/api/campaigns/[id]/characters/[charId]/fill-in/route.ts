// app/api/campaigns/[id]/characters/[charId]/fill-in/route.ts
// POST — AI-complete a sparse existing character: fills in only the blank
// fields the client sends, leaving anything already filled untouched (see
// fillInPremadeCharacter's merge logic). Returns a draft only; the client's
// existing Save Changes flow does the actual write, same pattern as the
// sibling "generate a premade character" route.

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import {
  fillInPremadeCharacter,
  MAX_PREMADE_GENERATIONS,
  type ExistingCharacterState,
} from '@/lib/character/generate-premade';

type RouteParams = { params: Promise<{ id: string; charId: string }> };
type Supabase = Awaited<ReturnType<typeof createClient>>;

async function authAndCampaign(campaignId: string, characterId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 as const, gameSystem: null, supabase: null, currentCount: 0 };
  }

  const [{ data: campaign }, { data: character }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, owner_id, game_system, character_generation_count')
      .eq('id', campaignId)
      .single(),
    supabase.from('characters').select('id').eq('id', characterId).eq('campaign_id', campaignId).single(),
  ]);

  if (!campaign || campaign.owner_id !== user.id || !character) {
    return { error: 'Character not found', status: 404 as const, gameSystem: null, supabase: null, currentCount: 0 };
  }

  return {
    error: null,
    status: 200 as const,
    gameSystem: campaign.game_system as string,
    supabase,
    currentCount: (campaign.character_generation_count as number) ?? 0,
  };
}

/** Soft anti-abuse guard, not a security boundary — same counter and pattern
 *  as the sibling characters/generate route (both cost one Claude call). */
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
  const { id, charId } = await params;
  const { error, status, gameSystem, supabase, currentCount } = await authAndCampaign(id, charId);

  if (error || !gameSystem || !supabase) {
    return NextResponse.json({ error }, { status });
  }

  const consumed = await tryConsumeGeneration(supabase, id, currentCount);
  if (!consumed) {
    return NextResponse.json(
      {
        error: `This campaign has reached its limit of ${MAX_PREMADE_GENERATIONS} AI character generations. Fill in the remaining fields manually.`,
      },
      { status: 429 }
    );
  }

  let body: { existing?: ExistingCharacterState; hint?: string };
  try {
    body = (await request.json()) as { existing?: ExistingCharacterState; hint?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!body.existing) {
    return NextResponse.json({ error: 'Missing current character state' }, { status: 400 });
  }

  try {
    const character = await fillInPremadeCharacter(gameSystem, body.existing, body.hint);
    return NextResponse.json({ character });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Character completion failed' },
      { status: 502 }
    );
  }
}
