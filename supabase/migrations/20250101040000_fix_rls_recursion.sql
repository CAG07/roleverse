-- ============================================================================
-- Fix RLS Recursion on campaign_members SELECT policy
-- The old policy caused infinite recursion when handle_new_campaign trigger
-- fired: INSERT to campaign_members triggered policy evaluation which
-- queried campaign_members again.
-- Fix: use a SECURITY DEFINER helper that bypasses RLS for the subquery.
-- ============================================================================

-- Helper function: returns the campaign_ids the calling user belongs to.
-- SECURITY DEFINER + empty search_path = runs as function owner, bypasses RLS.
CREATE OR REPLACE FUNCTION public.get_my_campaign_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT campaign_id FROM public.campaign_members
  WHERE user_id = auth.uid();
$$;

-- Recreate the SELECT policy using the helper instead of a self-referential
-- subquery.
DROP POLICY IF EXISTS "Members can view fellow members" ON public.campaign_members;
CREATE POLICY "Members can view fellow members"
  ON public.campaign_members FOR SELECT
  USING (campaign_id IN (SELECT public.get_my_campaign_ids()));
