-- supabase/migrations/20260815000000_workshop_resources.sql
-- Workshop: a curated external-resource directory (workshop_resources) plus a
-- submitter-scoped review queue (workshop_submissions), per docs/WORKSHOP.pdf's
-- content policy (Section 6: users submit suggestions, nothing publishes
-- automatically — the maintainer reviews and decides).
--
-- No maintainer/admin role exists anywhere in this schema (the app's earlier
-- admin page was gated by an ADMIN_EMAILS env allowlist with a fail-open bug
-- and was deliberately removed — see docs/ARCHITECTURE.md). Rather than
-- rebuild that class of risk, review of both tables happens manually via
-- Supabase Studio for this version: there is deliberately no INSERT/UPDATE/
-- DELETE policy on workshop_resources, and no UPDATE policy on
-- workshop_submissions for regular users. No SECURITY DEFINER helper is
-- needed here — neither policy below queries another RLS-protected table, so
-- there's no recursion risk to break.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.workshop_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'reference_srds',
    'world_building',
    'vtt_resources',
    'publisher_storefronts',
    'maps_art_generators',
    'community_spaces'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  affiliate_url TEXT,
  is_affiliate BOOLEAN NOT NULL DEFAULT false,
  is_partner BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT workshop_resources_affiliate_consistency CHECK (
    (NOT is_affiliate AND affiliate_url IS NULL) OR (is_affiliate AND affiliate_url IS NOT NULL)
  ),
  game_systems TEXT[] NOT NULL DEFAULT '{}',
  source_submission_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX workshop_resources_category_idx ON public.workshop_resources(category);

ALTER TABLE public.workshop_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view workshop resources"
  ON public.workshop_resources FOR SELECT
  USING (true);

CREATE TABLE public.workshop_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'reference_srds',
    'world_building',
    'vtt_resources',
    'publisher_storefronts',
    'maps_art_generators',
    'community_spaces'
  )),
  game_systems TEXT[] NOT NULL DEFAULT '{}',
  license_type TEXT NOT NULL,
  description TEXT NOT NULL,
  credit_submitter BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  decline_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX workshop_submissions_user_id_idx ON public.workshop_submissions(user_id);

ALTER TABLE public.workshop_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submissions"
  ON public.workshop_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own submissions"
  ON public.workshop_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
  ON public.workshop_submissions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.workshop_resources
  ADD CONSTRAINT workshop_resources_source_submission_fkey
  FOREIGN KEY (source_submission_id) REFERENCES public.workshop_submissions(id) ON DELETE SET NULL;
