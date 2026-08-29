// lib/mcp/tools/update-location.ts
// Location tracking tool: a fresh, targeted retrieval of a campaign's own
// uploaded module content, anchored to a label the Game Master composes
// itself rather than relying on the player's raw turn-by-turn wording.
//
// The GM's baseline per-turn retrieval (searchCampaignPriorityContent called
// directly in game-master.ts) embeds only the player's current message —
// which often doesn't semantically match the module's actual wording for
// the party's current location, especially on vague continuation turns
// ("what does Aldric do"). This tool gives the model a second, deliberate
// shot at grounding: call it, get real retrieved content back as the tool
// result (same shape as build-encounter.ts), narrate from it in the same
// turn — never a silent out-of-band fetch the model doesn't see.
//
// Sandbox fallback (2026-08-26): when no uploaded module content matches —
// sandbox play with no module at all, or a genuinely unmapped area — this
// falls back to a persisted, structured location seed (public.campaign_locations,
// see 20260826010000_campaign_locations.sql) instead of leaving the GM to
// invent unrecorded details every time. A revisit looks the row up by label
// first; only a genuinely new label rolls a fresh seed (generate-location-seed.ts,
// table-driven, not free-form LLM invention) and persists it. Same lazy,
// confirmed-use growth profile as flagNpc — nothing is generated or written
// until a location is actually visited.

import { searchCampaignPriorityContent } from '@/lib/rag/search-campaign-priority';
import { createClient } from '@/lib/supabase/server';
import { generateLocationSeed } from './generate-location-seed';
import type { MCPContext } from '../types';

export interface UpdateLocationInput {
  location_label: string;
}

export interface UpdateLocationMatch {
  content: string;
  mapLabel?: string;
  pageNumber?: number;
}

export interface GeneratedLocationResult {
  terrain: string;
  features: string[];
  exitCount: number;
  /** false when this label was already generated on an earlier visit */
  isNew: boolean;
}

export interface UpdateLocationOutput {
  locationLabel: string;
  mapLayout: UpdateLocationMatch[];
  moduleExcerpts: UpdateLocationMatch[];
  generatedLocation?: GeneratedLocationResult;
  note?: string;
}

export async function executeUpdateLocation(
  input: UpdateLocationInput,
  context: MCPContext
): Promise<UpdateLocationOutput> {
  const locationLabel = input.location_label.trim();

  const results = await searchCampaignPriorityContent(locationLabel, {
    campaignId: context.campaignId,
    sourceTypes: ['user_pdf'],
    matchCount: 8,
  });

  const mapLayout: UpdateLocationMatch[] = [];
  const moduleExcerpts: UpdateLocationMatch[] = [];

  for (const r of results) {
    const entry: UpdateLocationMatch = {
      content: r.content,
      mapLabel: (r.metadata?.mapLabel as string | undefined) ?? undefined,
      pageNumber: (r.metadata?.pageNumber as number | undefined) ?? undefined,
    };
    if (r.metadata?.category === 'map_layout') {
      mapLayout.push(entry);
    } else {
      moduleExcerpts.push(entry);
    }
  }

  if (mapLayout.length > 0 || moduleExcerpts.length > 0) {
    return { locationLabel, mapLayout, moduleExcerpts };
  }

  // Nothing in an uploaded module grounds this area — fall back to a
  // persisted sandbox seed rather than a one-off "narrate normally" note.
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('campaign_locations')
    .select('terrain, features, exit_count')
    .eq('campaign_id', context.campaignId)
    .eq('label', locationLabel)
    .maybeSingle();

  if (existing) {
    return {
      locationLabel,
      mapLayout,
      moduleExcerpts,
      generatedLocation: {
        terrain: existing.terrain as string,
        features: (existing.features as string[] | null) ?? [],
        exitCount: existing.exit_count as number,
        isNew: false,
      },
    };
  }

  const seed = generateLocationSeed();
  const { error: insertError } = await supabase.from('campaign_locations').insert({
    campaign_id: context.campaignId,
    owner_id: context.userId,
    label: locationLabel,
    terrain: seed.terrain,
    features: seed.features,
    exit_count: seed.exitCount,
  });

  if (insertError) {
    // Non-fatal — but try to return the persisted row if this was a uniqueness race,
    // so the GM doesn't narrate from a seed that won't be remembered.
    console.warn('[updateLocation] Failed to persist generated location:', insertError);

    const { data: raced } = await supabase
      .from('campaign_locations')
      .select('terrain, features, exit_count')
      .eq('campaign_id', context.campaignId)
      .eq('label', locationLabel)
      .maybeSingle();

    if (raced) {
      return {
        locationLabel,
        mapLayout,
        moduleExcerpts,
        generatedLocation: {
          terrain: raced.terrain as string,
          features: (raced.features as string[] | null) ?? [],
          exitCount: raced.exit_count as number,
          isNew: false,
        },
      };
    }
  }

  return {
    locationLabel,
    mapLayout,
    moduleExcerpts,
    generatedLocation: { ...seed, isNew: true },
  };
}
