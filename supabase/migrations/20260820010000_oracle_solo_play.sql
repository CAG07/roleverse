-- ============================================================================
-- Solo Oracle mode — player-supplied oracle/solo-play reference documents.
--
-- Design: players upload their OWN oracle system's rules (Mythic GME, Ask the
-- Oracle, a homebrew system, anything) the same way they already upload
-- module PDFs — this migration adds a distinct source_type so oracle content
-- is retrieved separately from module/house-rules content via the existing
-- match_campaign_priority_embeddings function (source_types is already an
-- array param — no new SQL function needed, see that migration's own comment
-- on why it's future-proofed this way).
-- ============================================================================

-- Extend the source_type allow-list (never edit the original CHECK from
-- 20260301000000_rag_phase_6a.sql — drop and recreate with the added value).
-- That original CHECK was added inline (unnamed), so its real name is
-- whatever Postgres auto-generated rather than something safe to guess and
-- hardcode here (can't verify against a local DB in this environment) — look
-- it up from pg_constraint instead of assuming the default naming scheme.
DO $$
DECLARE
  existing_constraint text;
BEGIN
  SELECT con.conname INTO existing_constraint
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
  WHERE rel.relname = 'campaign_embeddings'
    AND con.contype = 'c'
    AND att.attname = 'source_type';

  IF existing_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.campaign_embeddings DROP CONSTRAINT %I', existing_constraint);
  END IF;
END $$;

ALTER TABLE public.campaign_embeddings
  ADD CONSTRAINT campaign_embeddings_source_type_check
  CHECK (source_type IN ('baseline', 'house_rule', 'user_pdf', 'user_notes', 'oracle_ref'));

-- Storage bucket for uploaded oracle reference files, mirroring campaign-pdfs
-- exactly (private bucket, {user_id}/{campaign_id}/{filename} path convention,
-- same three-policy shape).
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-oracle-refs', 'campaign-oracle-refs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload oracle refs to own folder" ON storage.objects;
CREATE POLICY "Users can upload oracle refs to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'campaign-oracle-refs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own oracle refs" ON storage.objects;
CREATE POLICY "Users can read own oracle refs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'campaign-oracle-refs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own oracle refs" ON storage.objects;
CREATE POLICY "Users can delete own oracle refs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'campaign-oracle-refs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Per-campaign oracle state. Deliberately a single freeform TEXT field, not a
-- typed/CHECK-constrained numeric column like most of this project's other
-- additive columns: the whole point of "any oracle, fully customizable" is
-- that RoleVerse doesn't know or assume the shape of the player's system (a
-- Chaos Factor 1-9, a Fudge-dice modifier, nothing at all) — this is context
-- handed verbatim to the oracle-consultant prompt, never branched on in code,
-- so a rigid constraint here would fight the feature's own design intent
-- rather than protect anything.
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS oracle_state TEXT;

COMMENT ON COLUMN public.campaigns.oracle_state IS
  'Freeform player-maintained oracle state notes (e.g. "Chaos Factor: 5") in whatever terms the player''s own uploaded oracle system uses. Passed as context to the oracle consultant; never parsed/branched on.';

-- Anti-abuse/cost guard on oracle consultations, same shape as
-- character_generation_count/npc_generation_count
-- (20260819000000_campaign_generation_limits.sql) but a rolling daily cap
-- rather than a lifetime one — unlike one-time character generation, oracle
-- consultation is meant to happen many times per session.
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS oracle_consult_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS oracle_consult_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.campaigns.oracle_consult_count IS
  'Oracle consultations used since oracle_consult_reset_at. Capped at MAX_ORACLE_CONSULTS_PER_DAY (lib/oracle/consult-oracle.ts) in app/api/campaigns/[id]/oracle/consult/route.ts; resets on a rolling daily basis.';
COMMENT ON COLUMN public.campaigns.oracle_consult_reset_at IS
  'When oracle_consult_count was last reset. The consult route resets the counter (and this timestamp) whenever more than 24h have elapsed.';
