// lib/campaigns/campaign-videos.ts
// YouTube links a player adds by hand to a campaign (public.campaign_videos,
// see 20261027000000_campaign_videos.sql). Shared by the campaign-level Scene
// Library (CampaignScenesPanel) and the in-session picker (ScenePickerModal),
// same split as lib/campaigns/scene-assets.ts for images. Nothing is uploaded
// to Storage — only the video ID is saved, and playback is a YouTube embed.

import { createClient } from '@/lib/supabase/client';
import { extractYoutubeVideoId } from '@/lib/scenes/youtube';

export interface CampaignVideo {
  id: string;
  videoId: string;
  title: string | null;
}

/** Thumbnail served by YouTube itself — no Storage involved. */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export async function listCampaignVideos(
  campaignId: string
): Promise<{ videos: CampaignVideo[]; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('campaign_videos')
    .select('id, video_id, title')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  if (error) return { videos: [], error: error.message };

  return {
    videos: (data ?? []).map((row) => ({
      id: row.id as string,
      videoId: row.video_id as string,
      title: (row.title as string | null) ?? null,
    })),
    error: null,
  };
}

/** Parses a pasted YouTube link and saves it. Rejects anything that isn't a YouTube link. */
export async function addCampaignVideo(
  campaignId: string,
  url: string,
  title?: string
): Promise<{ video: CampaignVideo | null; error: string | null }> {
  const videoId = extractYoutubeVideoId(url.trim());
  if (!videoId) {
    return {
      video: null,
      error: 'That doesn\'t look like a YouTube link. Paste a link like https://www.youtube.com/watch?v=… or https://youtu.be/…',
    };
  }

  const supabase = createClient();
  const trimmedTitle = title?.trim() || null;
  const { data, error } = await supabase
    .from('campaign_videos')
    .insert({ campaign_id: campaignId, video_id: videoId, title: trimmedTitle })
    .select('id, video_id, title')
    .single();

  if (error) {
    // 23505 = unique_violation on (campaign_id, video_id)
    if (error.code === '23505') {
      return { video: null, error: 'That video is already in this campaign\'s Scene Library.' };
    }
    return { video: null, error: error.message };
  }

  return {
    video: {
      id: data.id as string,
      videoId: data.video_id as string,
      title: (data.title as string | null) ?? null,
    },
    error: null,
  };
}

export async function deleteCampaignVideo(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from('campaign_videos').delete().eq('id', id);
  return { error: error?.message ?? null };
}
