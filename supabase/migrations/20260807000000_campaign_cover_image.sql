-- ============================================================================
-- Campaign cover image (thumbnail)
--
-- Adds campaigns.cover_image_url plus a new public Storage bucket for the
-- image itself, following the exact same pattern as the existing
-- 'character-avatars' bucket (initial_schema.sql): one shared bucket,
-- partitioned by folder path rather than one bucket per user — RLS on
-- storage.objects enforces that a user can only write inside their own
-- folder, while reads stay public since these are non-sensitive display
-- images referenced by URL in the UI.
--
-- Files are stored at {user_id}/{campaign_id}/{filename}. The RLS policy
-- below only checks the first folder segment, so per-campaign subfolders
-- need no extra policy — same convention already used by 'campaign-pdfs'.
-- ============================================================================

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-covers', 'campaign-covers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view campaign covers" ON storage.objects;
CREATE POLICY "Anyone can view campaign covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-covers');

DROP POLICY IF EXISTS "Users can upload campaign covers to own folder" ON storage.objects;
CREATE POLICY "Users can upload campaign covers to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'campaign-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own campaign covers" ON storage.objects;
CREATE POLICY "Users can update own campaign covers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'campaign-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own campaign covers" ON storage.objects;
CREATE POLICY "Users can delete own campaign covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'campaign-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
