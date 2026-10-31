-- supabase/migrations/20261101010000_module_map_scan_version.sql
-- Which version of map reading produced a scan (lib/rag/map-scan-version.ts).
-- Version 2 also saves each map page's image and where each room sits on it,
-- so the Game Master can be shown the map around the party during play. The
-- Modules & Files panel re-runs any older scan automatically, so modules
-- uploaded before this change get pictures with no clicks needed.
-- Existing rows default to 1. Additive.

ALTER TABLE public.module_map_scans
  ADD COLUMN IF NOT EXISTS scan_version INTEGER NOT NULL DEFAULT 1;
