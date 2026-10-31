-- supabase/migrations/20261030010000_campaign_map_position.sql
-- Where the party is on an uploaded module's map: which map (level) and which
-- room. Written by the Game Master's updateLocation tool when the party moves
-- to a mapped room (lib/mcp/tools/update-location.ts) and shown to the Game
-- Master on every turn, so it stops losing track of the level and room
-- between turns and sessions. Shape:
--   { "mapLabel": text, "roomKey": text, "fileName": text, "pageNumber": int, "updatedAt": timestamptz }
-- Stored on campaigns rather than sessions because a campaign's sessions
-- continue one another. Additive and nullable; the existing
-- "Users can update own campaigns" policy already covers writes.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS current_map_position JSONB;
