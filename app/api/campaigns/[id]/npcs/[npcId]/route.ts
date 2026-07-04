// app/api/campaigns/[id]/npcs/[npcId]/route.ts
// GET    /api/campaigns/[id]/npcs/[npcId] — fetch a single NPC
// PATCH  /api/campaigns/[id]/npcs/[npcId] — update fields (replaces what is sent)
// DELETE /api/campaigns/[id]/npcs/[npcId] — hard delete

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import type { NpcInput, NpcKnownFact } from '@/lib/types/npc';
import { mergeKnownFacts } from '@/lib/npcs/merge-facts';

type RouteParams = { params: Promise<{ id: string; npcId: string }> };

async function authAndNpc(campaignId: string, npcId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { error: 'Unauthorized', status: 401, supabase: null, user: null, npc: null };

  const { data: npc } = await supabase
    .from('npcs')
    .select('*')
    .eq('id', npcId)
    .eq('campaign_id', campaignId)
    .eq('owner_id', user.id)
    .single();

  if (!npc) return { error: 'NPC not found', status: 404, supabase: null, user: null, npc: null };

  return { error: null, status: 200, supabase, user, npc };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id, npcId } = await params;
  const { error, status, npc } = await authAndNpc(id, npcId);

  if (error || !npc) return NextResponse.json({ error }, { status });

  return NextResponse.json({ npc });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id, npcId } = await params;
  const { error, status, supabase, user, npc } = await authAndNpc(id, npcId);

  if (error || !supabase || !user || !npc) return NextResponse.json({ error }, { status });

  let body: Partial<NpcInput> & { replace_facts?: boolean };
  try {
    body = (await request.json()) as Partial<NpcInput> & { replace_facts?: boolean };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const trimmedName = body.name.trim();
    if (!trimmedName) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    updatePayload.name = trimmedName;
  }
  if (body.race !== undefined) updatePayload.race = body.race;
  if (body.occupation !== undefined) updatePayload.occupation = body.occupation;
  if (body.description !== undefined) updatePayload.description = body.description;
  if (body.personality !== undefined) updatePayload.personality = body.personality;
  if (body.voice_notes !== undefined) updatePayload.voice_notes = body.voice_notes;
  if (body.disposition !== undefined) updatePayload.disposition = body.disposition;
  if (body.current_location !== undefined) updatePayload.current_location = body.current_location;

  if (body.known_facts !== undefined) {
    if (body.replace_facts) {
      // Direct replacement — used by delete-fact UI
      updatePayload.known_facts = body.known_facts;
    } else {
      // Append with case-insensitive substring deduplication
      const existing = (npc.known_facts as NpcKnownFact[]) ?? [];
      updatePayload.known_facts = mergeKnownFacts(existing, body.known_facts);
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ npc });
  }

  const { data: updated, error: updateError } = await supabase
    .from('npcs')
    .update(updatePayload)
    .eq('id', npcId)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === '23505') {
      return NextResponse.json(
        { error: `An NPC with that name already exists in this campaign.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ npc: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id, npcId } = await params;
  const { error, status, supabase, user } = await authAndNpc(id, npcId);

  if (error || !supabase || !user) return NextResponse.json({ error }, { status });

  const { error: deleteError } = await supabase
    .from('npcs')
    .delete()
    .eq('id', npcId)
    .eq('campaign_id', id)
    .eq('owner_id', user.id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
