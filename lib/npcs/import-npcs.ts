// lib/npcs/import-npcs.ts
// Direct-write path for NPC data that already exists in structured form —
// a module's stat blocks, an FG export. No extraction/LLM step: the caller
// already has the fields, this just upserts them with source='imported'.
//
// This function does NOT parse any specific module or FG format — that's
// future work. It's the write primitive a future parser/bridge calls once
// it has produced NpcInput objects.

import type { createClient } from '@/lib/supabase/server';
import type { Npc, NpcInput, NpcKnownFact } from '@/lib/types/npc';
import { mergeKnownFacts } from '@/lib/npcs/merge-facts';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function importNpcs(
  supabase: SupabaseClient,
  campaignId: string,
  ownerId: string,
  npcs: NpcInput[]
): Promise<{ created: number; updated: number }> {
  const toImport = npcs
    .map((n) => ({ ...n, name: n.name.trim() }))
    .filter((n) => n.name.length > 0);

  if (toImport.length === 0) return { created: 0, updated: 0 };

  const { data: existingRows, error: fetchError } = await supabase
    .from('npcs')
    .select('id, name, source, known_facts')
    .eq('campaign_id', campaignId);

  if (fetchError) throw new Error(`Failed to load existing NPCs: ${fetchError.message}`);

  const existingByLowerName = new Map(
    ((existingRows ?? []) as Pick<Npc, 'id' | 'name' | 'source' | 'known_facts'>[]).map((n) => [
      n.name.toLowerCase(),
      n,
    ])
  );

  let created = 0;
  let updated = 0;

  for (const npc of toImport) {
    const match = existingByLowerName.get(npc.name.toLowerCase());
    const incomingFacts = npc.known_facts ?? [];

    if (!match) {
      const { error: insertError } = await supabase.from('npcs').insert({
        campaign_id: campaignId,
        owner_id: ownerId,
        name: npc.name,
        race: npc.race?.trim() || null,
        occupation: npc.occupation?.trim() || null,
        description: npc.description?.trim() || null,
        personality: npc.personality?.trim() || null,
        voice_notes: npc.voice_notes?.trim() || null,
        disposition: npc.disposition ?? 'neutral',
        current_location: npc.current_location?.trim() || null,
        known_facts: incomingFacts,
        source: 'imported',
      });
      if (!insertError) created += 1;
      continue;
    }

    if (match.source === 'manual') {
      // Player-curated fields win — only append new facts.
      const merged = mergeKnownFacts((match.known_facts as NpcKnownFact[]) ?? [], incomingFacts);
      const { error: updateError } = await supabase
        .from('npcs')
        .update({ known_facts: merged })
        .eq('id', match.id);
      if (!updateError) updated += 1;
      continue;
    }

    // source === 'extracted' or 'imported' — structured import data is at least as
    // authoritative as an inferred extraction, so refresh core fields and (re-)mark
    // as imported. Re-running an import (e.g. an updated module version) also lands here.
    const merged = mergeKnownFacts((match.known_facts as NpcKnownFact[]) ?? [], incomingFacts);
    const { error: updateError } = await supabase
      .from('npcs')
      .update({
        race: npc.race?.trim() || null,
        occupation: npc.occupation?.trim() || null,
        description: npc.description?.trim() || null,
        personality: npc.personality?.trim() || null,
        voice_notes: npc.voice_notes?.trim() || null,
        disposition: npc.disposition ?? 'neutral',
        current_location: npc.current_location?.trim() || null,
        known_facts: merged,
        source: 'imported',
      })
      .eq('id', match.id);
    if (!updateError) updated += 1;
  }

  return { created, updated };
}
