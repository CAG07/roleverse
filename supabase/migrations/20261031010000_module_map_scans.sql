-- supabase/migrations/20261031010000_module_map_scans.sql
-- Progress of reading the maps in one uploaded module PDF, so a scan that was
-- interrupted (the player left the campaign page part way through) resumes
-- the next time the campaign is opened, with no clicks needed.
--
-- Map reading runs one page per request (app/api/campaigns/[id]/modules/maps),
-- driven by the Modules & Files panel. This row records which pages hold maps,
-- which of them have been read, and each page's result. claimed_at is set
-- while a request is working on the scan, so a second tab (or a resumed scan
-- while the previous page request is still finishing on the server) waits
-- instead of reading the same page twice. A claim older than the route's
-- 5-minute limit is treated as abandoned.

CREATE TABLE IF NOT EXISTS public.module_map_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Storage object name, matched against campaign_embeddings.metadata.title.
  file_name TEXT NOT NULL,
  -- finding: checking every page for maps; reading: reading map pages;
  -- done: finished; failed: the page check failed (error says why).
  status TEXT NOT NULL CHECK (status IN ('finding', 'reading', 'done', 'failed')),
  map_pages INTEGER[] NOT NULL DEFAULT '{}',
  -- One entry per page read: { pageNumber, mapsFound, roomsFound, truncated, read }.
  page_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  error TEXT,
  claimed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (campaign_id, file_name)
);

CREATE INDEX module_map_scans_owner_idx ON public.module_map_scans(owner_id);

ALTER TABLE public.module_map_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their map scans"
  ON public.module_map_scans FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can start map scans on their campaigns"
  ON public.module_map_scans FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their map scans"
  ON public.module_map_scans FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete their map scans"
  ON public.module_map_scans FOR DELETE
  USING (auth.uid() = owner_id);
