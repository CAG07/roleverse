-- supabase/migrations/20261027000000_campaign_videos.sql
-- YouTube links a player adds by hand to a campaign's Scene Library.
--
-- Until now the only videos RoleVerse knew about were YouTube links written
-- inside an uploaded document, detected at ingest time and stored in
-- campaign_embeddings.metadata.youtubeVideoId (see lib/campaigns/studio-media.ts).
-- This table lets a player paste a link directly — from the Scene Library, the
-- in-session scene picker, or Studio — without uploading any video file. Only
-- the 11-character YouTube video ID is stored; playback is a YouTube embed.

CREATE TABLE IF NOT EXISTS public.campaign_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,

  video_id TEXT NOT NULL CHECK (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Adding the same video twice to one campaign is a no-op, not a second row.
  UNIQUE (campaign_id, video_id)
);

CREATE INDEX campaign_videos_owner_idx ON public.campaign_videos(owner_id);
-- No separate campaign_id index: UNIQUE (campaign_id, video_id) already covers
-- lookups by campaign_id.

ALTER TABLE public.campaign_videos ENABLE ROW LEVEL SECURITY;

-- Owner-based RLS, same shape as public.campaign_locations
-- (20260826010000_campaign_locations.sql). No UPDATE policy: rows are only
-- ever added or deleted, never edited in place.
CREATE POLICY "Owners can view their campaign videos"
  ON public.campaign_videos FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can add videos to their campaigns"
  ON public.campaign_videos FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete their campaign videos"
  ON public.campaign_videos FOR DELETE
  USING (auth.uid() = owner_id);
