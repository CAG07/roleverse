-- ============================================================================
-- Multi-User and Discord Tables
-- Adds campaign membership, Discord integration, and voice profile tables.
-- ============================================================================

-- ============================================================================
-- RENAME campaigns.user_id → owner_id
-- The app code and all downstream migrations reference owner_id.
-- Idempotent: skips rename if already done (safe for fresh or re-created DB).
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'campaigns'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.campaigns RENAME COLUMN user_id TO owner_id;
  END IF;
END $$;

-- Recreate the index on the renamed column
DROP INDEX IF EXISTS campaigns_user_id_idx;
CREATE INDEX IF NOT EXISTS campaigns_owner_id_idx ON public.campaigns(owner_id);

-- Update existing campaigns RLS policies to use owner_id
DROP POLICY IF EXISTS "Users can create own campaigns" ON public.campaigns;
CREATE POLICY "Users can create own campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;
CREATE POLICY "Users can update own campaigns"
  ON public.campaigns FOR UPDATE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;
CREATE POLICY "Users can delete own campaigns"
  ON public.campaigns FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- CAMPAIGN MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.campaign_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('dm', 'player')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view fellow members" ON public.campaign_members;
CREATE POLICY "Members can view fellow members"
  ON public.campaign_members FOR SELECT
  USING (
    campaign_id IN (
      SELECT cm.campaign_id FROM public.campaign_members cm
      WHERE cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Campaign owner can add members" ON public.campaign_members;
CREATE POLICY "Campaign owner can add members"
  ON public.campaign_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner can remove or member can leave" ON public.campaign_members;
CREATE POLICY "Owner can remove or member can leave"
  ON public.campaign_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- ============================================================================
-- DISCORD USER LINKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.discord_user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_user_id TEXT UNIQUE NOT NULL,
  discord_username TEXT,
  linked_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.discord_user_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own discord links (select)" ON public.discord_user_links;
CREATE POLICY "Users manage own discord links (select)"
  ON public.discord_user_links FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own discord links (insert)" ON public.discord_user_links;
CREATE POLICY "Users manage own discord links (insert)"
  ON public.discord_user_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own discord links (update)" ON public.discord_user_links;
CREATE POLICY "Users manage own discord links (update)"
  ON public.discord_user_links FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own discord links (delete)" ON public.discord_user_links;
CREATE POLICY "Users manage own discord links (delete)"
  ON public.discord_user_links FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- DISCORD SERVER LINKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.discord_server_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT UNIQUE NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  linked_by UUID REFERENCES auth.users(id),
  voice_channel_id TEXT,
  text_channel_id TEXT,
  linked_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.discord_server_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Campaign members can view server links" ON public.discord_server_links;
CREATE POLICY "Campaign members can view server links"
  ON public.discord_server_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_members cm
      WHERE cm.campaign_id = campaign_id AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Linker can insert server links" ON public.discord_server_links;
CREATE POLICY "Linker can insert server links"
  ON public.discord_server_links FOR INSERT
  WITH CHECK (auth.uid() = linked_by);

DROP POLICY IF EXISTS "Linker can update server links" ON public.discord_server_links;
CREATE POLICY "Linker can update server links"
  ON public.discord_server_links FOR UPDATE
  USING (auth.uid() = linked_by);

DROP POLICY IF EXISTS "Linker can delete server links" ON public.discord_server_links;
CREATE POLICY "Linker can delete server links"
  ON public.discord_server_links FOR DELETE
  USING (auth.uid() = linked_by);

-- ============================================================================
-- VOICE PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('agent', 'npc')),
  entity_id TEXT NOT NULL,
  voice_provider TEXT DEFAULT 'openai' CHECK (voice_provider IN ('openai', 'elevenlabs')),
  voice_id TEXT NOT NULL,
  speed FLOAT DEFAULT 1.0,
  pitch FLOAT DEFAULT 1.0
);

ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Campaign members can view voice profiles" ON public.voice_profiles;
CREATE POLICY "Campaign members can view voice profiles"
  ON public.voice_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_members cm
      WHERE cm.campaign_id = campaign_id AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Campaign owner can insert voice profiles" ON public.voice_profiles;
CREATE POLICY "Campaign owner can insert voice profiles"
  ON public.voice_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Campaign owner can update voice profiles" ON public.voice_profiles;
CREATE POLICY "Campaign owner can update voice profiles"
  ON public.voice_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Campaign owner can delete voice profiles" ON public.voice_profiles;
CREATE POLICY "Campaign owner can delete voice profiles"
  ON public.voice_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- AUTO-INSERT TRIGGER: Add campaign creator as DM member
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_campaign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.campaign_members (campaign_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'dm');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_campaign_created ON public.campaigns;
CREATE TRIGGER on_campaign_created
  AFTER INSERT ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_campaign();

-- ============================================================================
-- UPDATE CAMPAIGNS SELECT POLICY: Members can also view joined campaigns
-- ============================================================================

-- Replace the SELECT policy from initial_schema so members can also view
DROP POLICY IF EXISTS "Users can view own campaigns" ON public.campaigns;

DROP POLICY IF EXISTS "Members can view joined campaigns" ON public.campaigns;
CREATE POLICY "Members can view joined campaigns"
  ON public.campaigns FOR SELECT
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.campaign_members cm
      WHERE cm.campaign_id = id AND cm.user_id = auth.uid()
    )
  );
