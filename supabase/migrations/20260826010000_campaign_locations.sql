-- supabase/migrations/20260826010000_campaign_locations.sql
-- Sandbox location generation (Phase 2 of the AI-Assist/oracle expansion plan).
--
-- Backs the updateLocation tool's new fallback (lib/mcp/tools/update-location.ts):
-- when the party moves to a genuinely new area and no uploaded module content
-- matches it, the GM previously just invented freely from training knowledge
-- with nothing remembered. Now it rolls a small structured seed (terrain,
-- a couple of features, an exit count) from fixed tables and persists it here,
-- so a revisited location comes back the same rather than being reinvented.
--
-- Deliberately tiny rows, not prose: no embedding/vector column, this table is
-- looked up by campaign_id + label, never semantically searched. Same
-- lazy-on-confirmed-use growth profile as the npcs table (20260601000000) —
-- nothing is written until a location is actually visited.

CREATE TABLE IF NOT EXISTS public.campaign_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  label TEXT NOT NULL,
  terrain TEXT NOT NULL,
  features TEXT[] NOT NULL DEFAULT '{}',
  exit_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each campaign's generated locations should be unique to avoid agent confusion,
  -- same reasoning as npcs' (campaign_id, name) constraint.
  UNIQUE (campaign_id, label)
);

CREATE INDEX campaign_locations_campaign_idx ON public.campaign_locations(campaign_id);
CREATE INDEX campaign_locations_owner_idx ON public.campaign_locations(owner_id);
-- No separate LOWER(label) index: the UNIQUE(campaign_id, label) constraint above
-- already indexes (campaign_id, label), and the lookup in update-location.ts uses
-- .ilike('label', ...), which a functional LOWER() index wouldn't be used by anyway
-- (Postgres only uses that shape for a literal `WHERE LOWER(label) = ...` predicate).

ALTER TABLE public.campaign_locations ENABLE ROW LEVEL SECURITY;

-- Standard owner-based RLS, mirrors public.npcs (20260601000000_npc_roster.sql)
CREATE POLICY "Owners can view their campaign locations"
  ON public.campaign_locations FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert campaign locations in their campaigns"
  ON public.campaign_locations FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their campaign locations"
  ON public.campaign_locations FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete their campaign locations"
  ON public.campaign_locations FOR DELETE
  USING (auth.uid() = owner_id);
