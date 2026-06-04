// app/api/campaigns/[id]/npcs/route.ts
// GET /api/campaigns/[id]/npcs  — list all NPCs for a campaign
// POST /api/campaigns/[id]/npcs — create a new NPC

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import type { NpcInput } from '@/lib/types/npc';

type RouteParams = { params: Promise<{ id: string }> };

async function authAndCampaign(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { error: 'Unauthorized', status: 401, supabase: null, user: null };

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, owner_id')
    .eq('id', campaignId)
    .single();

  if (!campaign || campaign.owner_id !== user.id) {
    return { error: 'Campaign not found', status: 404, supabase: null, user: null };
  }

  return { error: null, status: 200, supabase, user };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { error, status, supabase, user } = await authAndCampaign(id);

  if (error || !supabase || !user) {
    return NextResponse.json({ error }, { status });
  }

  const { data: npcs, error: queryError } = await supabase
    .from('npcs')
    .select('*')
    .eq('campaign_id', id)
    .order('name', { ascending: true });

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  return NextResponse.json({ npcs: npcs ?? [] });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { error, status, supabase, user } = await authAndCampaign(id);

  if (error || !supabase || !user) {
    return NextResponse.json({ error }, { status });
  }

  let body: NpcInput;
  try {
    body = (await request.json()) as NpcInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const { data: npc, error: insertError } = await supabase
    .from('npcs')
    .insert({
      campaign_id: id,
      owner_id: user.id,
      name: body.name.trim(),
      race: body.race ?? null,
      occupation: body.occupation ?? null,
      description: body.description ?? null,
      personality: body.personality ?? null,
      voice_notes: body.voice_notes ?? null,
      disposition: body.disposition ?? 'neutral',
      current_location: body.current_location ?? null,
      known_facts: body.known_facts ?? [],
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: `An NPC named "${body.name.trim()}" already exists in this campaign.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ npc }, { status: 201 });
}
