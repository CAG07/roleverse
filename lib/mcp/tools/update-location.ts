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

import { searchCampaignPriorityContent } from '@/lib/rag/search-campaign-priority';
import type { MCPContext } from '../types';

export interface UpdateLocationInput {
  location_label: string;
}

export interface UpdateLocationMatch {
  content: string;
  mapLabel?: string;
  pageNumber?: number;
}

export interface UpdateLocationOutput {
  locationLabel: string;
  mapLayout: UpdateLocationMatch[];
  moduleExcerpts: UpdateLocationMatch[];
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

  if (mapLayout.length === 0 && moduleExcerpts.length === 0) {
    return {
      locationLabel,
      mapLayout,
      moduleExcerpts,
      note: 'No uploaded module content matched this location — nothing authoritative found, narrate normally.',
    };
  }

  return { locationLabel, mapLayout, moduleExcerpts };
}
