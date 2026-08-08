-- ============================================================================
-- Campaign scene asset library
--
-- Storage-only for now: a bucket for player/DM-uploaded photos and videos that
-- can be manually attached as the active scene during a session. On-demand AI
-- image generation is a deliberately separate, later phase — it carries real
-- per-call cost (unlike text tokens) and needs usage gating that doesn't exist
-- yet, so it's not wired into this bucket or any UI.
--
-- Same pattern as 'campaign-covers' (public read, RLS-restricted write to the
-- owning user's folder) — see 20260807000000_campaign_cover_image.sql for the
-- full rationale on bucket-sharing vs. bucket-per-user.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-scenes', 'campaign-scenes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view campaign scenes" ON storage.objects;
CREATE POLICY "Anyone can view campaign scenes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-scenes');

DROP POLICY IF EXISTS "Users can upload campaign scenes to own folder" ON storage.objects;
CREATE POLICY "Users can upload campaign scenes to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'campaign-scenes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own campaign scenes" ON storage.objects;
CREATE POLICY "Users can delete own campaign scenes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'campaign-scenes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
