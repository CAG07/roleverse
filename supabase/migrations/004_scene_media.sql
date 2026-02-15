-- supabase/migrations/004_scene_media.sql
-- Scene media storage for campaign assets and AI-generated content

CREATE TABLE public.scene_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  session_id uuid,
  type text NOT NULL CHECK (type IN ('image', 'video')),
  url text NOT NULL,
  caption text,
  source text NOT NULL CHECK (source IN ('campaign_asset', 'ai_generated')),
  generated_by text,
  campaign_asset_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index for efficient campaign-scoped queries
CREATE INDEX idx_scene_media_campaign_id ON public.scene_media(campaign_id);

-- RLS
ALTER TABLE public.scene_media ENABLE ROW LEVEL SECURITY;

-- SELECT: user is a member of the associated campaign
CREATE POLICY "scene_media_select_member"
  ON public.scene_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_members cm
      WHERE cm.campaign_id = public.scene_media.campaign_id
        AND cm.user_id = auth.uid()
    )
  );

-- INSERT: user is the campaign owner (DM presents media)
CREATE POLICY "scene_media_insert_owner"
  ON public.scene_media
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = public.scene_media.campaign_id
        AND c.owner_id = auth.uid()
    )
  );

-- DELETE: user is the campaign owner
CREATE POLICY "scene_media_delete_owner"
  ON public.scene_media
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = public.scene_media.campaign_id
        AND c.owner_id = auth.uid()
    )
  );
