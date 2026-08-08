// lib/scenes/image-ref.ts
// Detects a player's own uploaded Scene Library image being referenced by
// filename inside an uploaded document's text — the same idea as the
// YouTube-link detection in lib/scenes/youtube.ts, applied to images that
// are already separate files rather than embedded in a PDF page.

import type { SupabaseClient } from '@supabase/supabase-js';

const SCENES_BUCKET = 'campaign-scenes';

/** Strips the numeric upload-timestamp prefix Storage filenames carry (see
 * toDisplayName in lib/campaigns/scene-assets.ts) so matching is against the
 * name a player actually recognizes, not the raw storage key. */
function toDisplayName(storageName: string): string {
  return storageName.replace(/^\d+-/, '');
}

/**
 * Lists a campaign's Scene Library display filenames using the caller's own
 * (server-side, RLS-scoped) Supabase client — a server-safe twin of
 * scene-assets.ts's listCampaignScenes, which constructs its own browser-only
 * client via @/lib/supabase/client and can't run in a server ingest route.
 */
export async function listCampaignSceneFilenames(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string
): Promise<string[]> {
  const folderPath = `${userId}/${campaignId}`;
  const { data, error } = await supabase.storage.from(SCENES_BUCKET).list(folderPath);
  if (error || !data) return [];
  return data.filter((f) => f.id !== null).map((f) => toDisplayName(f.name));
}

/** Finds the first Scene Library filename mentioned in the given text, if any. */
export function extractImageRef(text: string, filenames: string[]): string | null {
  for (const filename of filenames) {
    if (filename && text.includes(filename)) return filename;
  }
  return null;
}
