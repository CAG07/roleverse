// lib/campaigns/scene-assets.ts
// Shared listing logic for the 'campaign-scenes' Storage bucket, used by both the
// campaign-level library manager (CampaignScenesPanel) and the in-session picker
// (ScenePickerModal).

import { createClient } from '@/lib/supabase/client';

export interface SceneAsset {
  name: string;
  displayName: string;
  type: 'image' | 'video';
  url: string;
}

export function toDisplayName(storageName: string): string {
  return storageName.replace(/^\d+-/, '');
}

export async function listCampaignScenes(campaignId: string): Promise<{
  assets: SceneAsset[];
  folderPath: string | null;
  error: string | null;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { assets: [], folderPath: null, error: null };

  const folderPath = `${user.id}/${campaignId}`;
  const { data, error } = await supabase.storage.from('campaign-scenes').list(folderPath);
  if (error) return { assets: [], folderPath, error: error.message };

  const assets = (data ?? [])
    .filter((f) => f.id !== null)
    .map((f) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from('campaign-scenes').getPublicUrl(`${folderPath}/${f.name}`);
      return {
        name: f.name,
        displayName: toDisplayName(f.name),
        type: (f.metadata?.mimetype as string | undefined)?.startsWith('video/')
          ? ('video' as const)
          : ('image' as const),
        url: publicUrl,
      };
    });

  return { assets, folderPath, error: null };
}
