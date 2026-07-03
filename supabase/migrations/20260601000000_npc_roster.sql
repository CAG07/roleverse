-- supabase/migrations/20260601000000_npc_roster.sql
-- NPC roster for stateful per-campaign NPCs.
--
-- Disposition is an enum with 5 values, applies to the party as a whole.
-- known_facts is a structured JSONB array where each fact has its text,
-- the session it was learned in, and a timestamp.
-- Updates flow through player-confirmed proposals, not direct agent writes.

CREATE TYPE public.npc_disposition AS ENUM (
  'friendly',
  'helpful',
  'neutral',
  'wary',
  'hostile'
);

CREATE TABLE IF NOT EXISTS public.npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  race TEXT,
  occupation TEXT,
  description TEXT,

  -- Voice & personality (used by NPC Dialogue agent for in-character voicing)
  personality TEXT,
  voice_notes TEXT,

  -- State
  disposition public.npc_disposition NOT NULL DEFAULT 'neutral',
  current_location TEXT,

  -- Structured facts the NPC knows or has learned about the party.
  -- Array of objects: [{ fact: string, learned_in_session: uuid | null, learned_at: timestamptz }]
  known_facts JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each campaign's NPC names should be unique to avoid agent confusion
  UNIQUE (campaign_id, name)
);

CREATE INDEX npcs_campaign_idx ON public.npcs(campaign_id);
CREATE INDEX npcs_owner_idx ON public.npcs(owner_id);
CREATE INDEX npcs_name_lower_idx ON public.npcs(campaign_id, LOWER(name));

ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;

-- Standard owner-based RLS, mirrors characters table
CREATE POLICY "Owners can view their NPCs"
  ON public.npcs FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert NPCs in their campaigns"
  ON public.npcs FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their NPCs"
  ON public.npcs FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete their NPCs"
  ON public.npcs FOR DELETE
  USING (auth.uid() = owner_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER npcs_set_updated_at
  BEFORE UPDATE ON public.npcs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
