-- Terms of Service acceptance gate.
--
-- Nullable timestamp column carries both facts (whether accepted, and when) —
-- no separate boolean needed. Gated via lib/supabase/middleware.ts, which
-- redirects any authenticated user with tos_accepted_at IS NULL to /welcome.
--
-- Also adds the profiles table's first-ever INSERT policy. profiles has had
-- only SELECT/UPDATE policies since the initial schema (20250101000000) and
-- no application code has ever written to it — display name is read from
-- auth user_metadata instead. The /welcome accept-action's client-side
-- upsert (self-healing for a user with no existing profiles row) needs this
-- policy to succeed under RLS.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.tos_accepted_at IS
  'Timestamp the user accepted the Terms of Service shown at /welcome. NULL = not yet accepted, gates access to /(app) routes via lib/supabase/middleware.ts. Placeholder legal text only until real legal review — see app/welcome/page.tsx.';

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
