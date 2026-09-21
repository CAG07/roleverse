-- supabase/migrations/20260811000000_lock_campaign_game_system.sql
-- Locks campaigns.game_system after creation. The EditCampaignPage UI already
-- stopped offering a control to change it, but that alone doesn't stop a
-- direct client call — RLS's "Users can update own campaigns" policy only
-- checks ownership (auth.uid() = user_id), not which columns/values an
-- UPDATE may touch. Switching a live campaign's system silently breaks
-- several things downstream (characters.game_system never re-syncs,
-- campaign_embeddings rows keep a stale tag, build-encounter.ts's budget-math
-- code path flips) — see project discussion for the full blast-radius
-- analysis. This trigger makes the lock a real guarantee instead of a UI
-- convention, mirroring the existing sync_character_game_system() pattern.

CREATE OR REPLACE FUNCTION public.prevent_campaign_game_system_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.game_system IS DISTINCT FROM OLD.game_system THEN
    RAISE EXCEPTION 'campaigns.game_system cannot be changed after creation (was %, attempted %)',
      OLD.game_system, NEW.game_system;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaign_game_system_lock ON public.campaigns;
CREATE TRIGGER campaign_game_system_lock
  BEFORE UPDATE OF game_system ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_campaign_game_system_change();
