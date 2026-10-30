-- Remove the shared baseline rules embeddings for AD&D 1E, AD&D 2E, and DCC.
--
-- These rows came from hand-written rules summaries (data/osric-stub.md and
-- data/dcc-stub.md), which have been deleted: the shared baseline index now holds
-- lookup data only (spells, and 5E monsters for the encounter builder), and rules
-- come from rulebooks players upload to their own campaigns.
--
-- The ingestion workflow can't do this itself: it only retires old generations
-- after writing a new one, and these systems no longer have a fetcher.
--
-- Scoped to baseline rows (campaign_id IS NULL). Player uploads for these systems
-- are campaign-scoped and are not touched.

DELETE FROM public.campaign_embeddings
WHERE campaign_id IS NULL
  AND source_type = 'baseline'
  AND game_system IN ('ADD1E', 'ADD2E', 'DCC');
