// lib/campaigns/studio-media.ts
// Shared listing logic for Studio's Videos section — mirrors the shape of
// lib/campaigns/scene-assets.ts's listCampaignScenes, but for YouTube links
// already detected and persisted at PDF-ingest time (see extractYoutubeVideoId
// in lib/scenes/youtube.ts, written into campaign_embeddings.metadata by
// lib/rag/ingest-campaign-pdf.ts). Takes a SupabaseClient rather than
// constructing one, so it works from both the server route (studio page) and
// any future client-side caller, same convention as lib/rag/ingest-campaign-pdf.ts.
import type { SupabaseClient } from '@supabase/supabase-js';

export interface StudioVideo {
  videoId: string;
  /** A short excerpt of the chunk text the link was found in, for context. */
  snippet: string;
  /** The uploaded document/module title the link came from, if known. */
  source: string | null;
}

export async function listCampaignVideos(
  supabase: SupabaseClient,
  campaignId: string
): Promise<StudioVideo[]> {
  const { data } = await supabase
    .from('campaign_embeddings')
    .select('content, metadata')
    .eq('campaign_id', campaignId)
    .not('metadata->>youtubeVideoId', 'is', null);

  const seen = new Set<string>();
  const videos: StudioVideo[] = [];

  for (const row of data ?? []) {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const videoId = metadata.youtubeVideoId as string | undefined;
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);

    const content = (row.content as string | undefined) ?? '';
    videos.push({
      videoId,
      snippet: content.length > 160 ? `${content.slice(0, 160)}…` : content,
      source: (metadata.title as string | undefined) ?? null,
    });
  }

  return videos;
}
