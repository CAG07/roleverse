// lib/campaigns/scene-assets.ts
// Shared listing + upload logic for the 'campaign-scenes' Storage bucket, used
// by both the campaign-level library manager (CampaignScenesPanel) and the
// in-session picker (ScenePickerModal) — the latter previously had no upload
// capability at all, requiring a player to leave the session to add a photo.

import { createClient } from '@/lib/supabase/client';
import { assertWithinQuota, getUsedBytes } from '@/lib/storage/check-quota';

export interface SceneAsset {
  name: string;
  displayName: string;
  type: 'image';
  url: string;
}

export const SCENE_BUCKET = 'campaign-scenes';
export const SCENE_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB per file
export const SCENE_CAMPAIGN_QUOTA_BYTES = 25 * 1024 * 1024; // 25MB per campaign

export function toDisplayName(storageName: string): string {
  return storageName.replace(/^\d+-/, '');
}

function toStorageName(originalName: string): string {
  return `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
  const { data, error } = await supabase.storage.from(SCENE_BUCKET).list(folderPath);
  if (error) return { assets: [], folderPath, error: error.message };

  const assets = (data ?? [])
    .filter((f) => f.id !== null)
    .map((f) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from(SCENE_BUCKET).getPublicUrl(`${folderPath}/${f.name}`);
      return {
        name: f.name,
        displayName: toDisplayName(f.name),
        type: 'image' as const,
        url: publicUrl,
      };
    });

  return { assets, folderPath, error: null };
}

/** Validates, quota-checks, and uploads a scene image, returning the new asset. */
export async function uploadCampaignScene(
  campaignId: string,
  file: File
): Promise<{ asset: SceneAsset | null; error: string | null }> {
  if (!file.type.startsWith('image/')) {
    return { asset: null, error: 'Only image files are supported.' };
  }
  if (file.size > SCENE_IMAGE_MAX_BYTES) {
    return { asset: null, error: `Image must be ${SCENE_IMAGE_MAX_BYTES / (1024 * 1024)}MB or smaller.` };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { asset: null, error: 'Not signed in.' };

  const folderPath = `${user.id}/${campaignId}`;

  try {
    await assertWithinQuota(supabase, SCENE_BUCKET, folderPath, file.size, SCENE_CAMPAIGN_QUOTA_BYTES, 'scene library');
  } catch (err) {
    return { asset: null, error: err instanceof Error ? err.message : 'Storage quota check failed.' };
  }

  const storageName = toStorageName(file.name);
  const path = `${folderPath}/${storageName}`;
  const { error: uploadError } = await supabase.storage
    .from(SCENE_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { asset: null, error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(SCENE_BUCKET).getPublicUrl(path);

  return {
    asset: { name: storageName, displayName: toDisplayName(storageName), type: 'image', url: publicUrl },
    error: null,
  };
}

/** Used by callers (e.g. CampaignScenesPanel's live quota bar) that need the current usage total. */
export async function getSceneUsedBytes(campaignId: string): Promise<number | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getUsedBytes(supabase, SCENE_BUCKET, `${user.id}/${campaignId}`);
}
