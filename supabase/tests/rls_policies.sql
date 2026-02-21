-- supabase/tests/rls_policies.sql
-- pgTAP tests to verify Row Level Security policies are correctly configured.
-- Run with: supabase test db

BEGIN;

SELECT plan(30);

-- ============================================================================
-- 1. Verify RLS is enabled on all tables
-- ============================================================================

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace),
  true,
  'RLS is enabled on profiles'
);

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'campaigns' AND relnamespace = 'public'::regnamespace),
  true,
  'RLS is enabled on campaigns'
);

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'characters' AND relnamespace = 'public'::regnamespace),
  true,
  'RLS is enabled on characters'
);

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'sessions' AND relnamespace = 'public'::regnamespace),
  true,
  'RLS is enabled on sessions'
);

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'combat_state' AND relnamespace = 'public'::regnamespace),
  true,
  'RLS is enabled on combat_state'
);

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'campaign_embeddings' AND relnamespace = 'public'::regnamespace),
  true,
  'RLS is enabled on campaign_embeddings'
);

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'fg_commands' AND relnamespace = 'public'::regnamespace),
  true,
  'RLS is enabled on fg_commands'
);

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'campaign_members' AND relnamespace = 'public'::regnamespace),
  true,
  'RLS is enabled on campaign_members'
);

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'discord_user_links' AND relnamespace = 'public'::regnamespace),
  true,
  'RLS is enabled on discord_user_links'
);

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'discord_server_links' AND relnamespace = 'public'::regnamespace),
  true,
  'RLS is enabled on discord_server_links'
);

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'voice_profiles' AND relnamespace = 'public'::regnamespace),
  true,
  'RLS is enabled on voice_profiles'
);

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'scene_media' AND relnamespace = 'public'::regnamespace),
  true,
  'RLS is enabled on scene_media'
);

-- ============================================================================
-- 2. Verify campaigns uses owner_id (not user_id)
-- ============================================================================

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'campaigns'
      AND column_name = 'owner_id'
  ),
  'campaigns table has owner_id column'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'campaigns'
      AND column_name = 'user_id'
  ),
  'campaigns table does NOT have user_id column (renamed to owner_id)'
);

-- ============================================================================
-- 3. Verify expected RLS policies exist on each table
-- ============================================================================

-- campaigns policies
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campaigns'
      AND policyname = 'Members can view joined campaigns'
  ),
  'campaigns has "Members can view joined campaigns" SELECT policy'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campaigns'
      AND policyname = 'Users can create own campaigns'
      AND cmd = 'INSERT'
  ),
  'campaigns has INSERT policy using owner_id'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campaigns'
      AND policyname = 'Users can update own campaigns'
      AND cmd = 'UPDATE'
  ),
  'campaigns has UPDATE policy using owner_id'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campaigns'
      AND policyname = 'Users can delete own campaigns'
      AND cmd = 'DELETE'
  ),
  'campaigns has DELETE policy using owner_id'
);

-- campaign_members policies
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campaign_members'
      AND policyname = 'Members can view fellow members'
  ),
  'campaign_members has SELECT policy'
);

-- ============================================================================
-- 6. Verify get_my_campaign_ids() helper function exists (RLS recursion fix)
-- ============================================================================

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_my_campaign_ids'
      AND pronamespace = 'public'::regnamespace
  ),
  'get_my_campaign_ids() function exists in public schema'
);

SELECT ok(
  (
    SELECT prosecdef FROM pg_proc
    WHERE proname = 'get_my_campaign_ids'
      AND pronamespace = 'public'::regnamespace
  ),
  'get_my_campaign_ids() is SECURITY DEFINER'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campaign_members'
      AND policyname = 'Campaign owner can add members'
      AND cmd = 'INSERT'
  ),
  'campaign_members has INSERT policy (owner only)'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campaign_members'
      AND policyname = 'Owner can remove or member can leave'
      AND cmd = 'DELETE'
  ),
  'campaign_members has DELETE policy (owner or self)'
);

-- scene_media policies (implicit membership model)
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scene_media'
      AND policyname = 'scene_media_select_member'
      AND cmd = 'SELECT'
  ),
  'scene_media has SELECT policy (implicit membership via characters)'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scene_media'
      AND policyname = 'scene_media_insert_owner'
      AND cmd = 'INSERT'
  ),
  'scene_media has INSERT policy (owner only)'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scene_media'
      AND policyname = 'scene_media_delete_owner'
      AND cmd = 'DELETE'
  ),
  'scene_media has DELETE policy (owner only)'
);

-- ============================================================================
-- 4. Verify scene_media SELECT policy uses characters table (not campaign_members)
-- ============================================================================

SELECT ok(
  (
    SELECT qual::text LIKE '%characters%'
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scene_media'
      AND policyname = 'scene_media_select_member'
  ),
  'scene_media SELECT policy references characters table (implicit membership)'
);

SELECT ok(
  (
    SELECT qual::text LIKE '%owner_id%'
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scene_media'
      AND policyname = 'scene_media_select_member'
  ),
  'scene_media SELECT policy references owner_id (DM access)'
);

-- ============================================================================
-- 5. Verify handle_new_campaign trigger exists
-- ============================================================================

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'campaigns'
      AND trigger_name = 'on_campaign_created'
  ),
  'on_campaign_created trigger exists on campaigns table'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'handle_new_campaign'
      AND pronamespace = 'public'::regnamespace
  ),
  'handle_new_campaign function exists'
);

SELECT * FROM finish();

ROLLBACK;
