-- RoleVerse Database Schema
-- Run this after creating a new Supabase project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- USERS & AUTH (Managed by Supabase Auth, these are additional profiles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- CAMPAIGNS
-- ============================================================================

-- Add game system fields to campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Game system (user selects)
  game_system TEXT NOT NULL DEFAULT '5E_2014',
  
  -- Fantasy Grounds integration
  fg_campaign_id TEXT UNIQUE,
  fg_ruleset TEXT,
  source TEXT DEFAULT 'web', -- 'web' or 'fg_import'
  
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint for valid game systems (idempotent: skip if already exists)
DO $$ BEGIN
  ALTER TABLE public.campaigns
    ADD CONSTRAINT valid_game_system
    CHECK (game_system IN (
      'ADD1E', 'ADD2E', '3_5E', '4E', '5E_2014', '5E_2024',
      'PATHFINDER', 'PATHFINDER_2E', 'DCC', 'TOR1E', 'TOR2E', 'CYBERPUNK_2020'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS Policies for campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own campaigns" ON public.campaigns;
CREATE POLICY "Users can view own campaigns"
  ON public.campaigns FOR SELECT
  USING (auth.uid() = owner_id);

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

-- Index for faster queries
CREATE INDEX IF NOT EXISTS campaigns_owner_id_idx ON public.campaigns(owner_id);

-- ============================================================================
-- CHARACTERS (Synced from Fantasy Grounds)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  
  -- Game system (inherited from campaign)
  game_system TEXT NOT NULL DEFAULT '5E_2014',
  
  -- Universal fields
  name TEXT NOT NULL,
  class TEXT,
  level INTEGER DEFAULT 1,
  race TEXT,
  hp INTEGER DEFAULT 0,
  max_hp INTEGER DEFAULT 0,
  avatar_url TEXT,
  
  -- Game-specific data (JSONB - flexible)
  game_data_stats JSONB DEFAULT '{}'::jsonb,
  game_data_combat JSONB DEFAULT '{}'::jsonb,
  game_data_saves JSONB DEFAULT '{}'::jsonb,
  game_data_skills JSONB DEFAULT '{}'::jsonb,
  game_data_abilities JSONB DEFAULT '[]'::jsonb,
  equipment JSONB DEFAULT '[]'::jsonb,
  spells JSONB DEFAULT '[]'::jsonb,
  
  -- Fantasy Grounds sync
  fg_character_id TEXT,
  fg_raw_data JSONB,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for characters
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own characters" ON public.characters;
CREATE POLICY "Users can view own characters"
  ON public.characters FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own characters" ON public.characters;
CREATE POLICY "Users can create own characters"
  ON public.characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own characters" ON public.characters;
CREATE POLICY "Users can update own characters"
  ON public.characters FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own characters" ON public.characters;
CREATE POLICY "Users can delete own characters"
  ON public.characters FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS characters_user_id_idx ON public.characters(user_id);
CREATE INDEX IF NOT EXISTS characters_campaign_id_idx ON public.characters(campaign_id);
CREATE INDEX IF NOT EXISTS characters_fg_id_idx ON public.characters(fg_character_id) WHERE fg_character_id IS NOT NULL;

-- ============================================================================
-- SESSIONS (Game Sessions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  state JSONB DEFAULT '{}'::jsonb, -- Current game state
  transcript JSONB DEFAULT '[]'::jsonb, -- Session transcript
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own sessions" ON public.sessions;
CREATE POLICY "Users can create own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS sessions_campaign_id_idx ON public.sessions(campaign_id);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_started_at_idx ON public.sessions(started_at DESC);

-- ============================================================================
-- COMBAT STATE (Real-time combat tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.combat_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  round INTEGER DEFAULT 1,
  current_turn INTEGER DEFAULT 0,
  initiative_order JSONB DEFAULT '[]'::jsonb, -- Array of { character_id, initiative, name }
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for combat_state
ALTER TABLE public.combat_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own combat state" ON public.combat_state;
CREATE POLICY "Users can view own combat state"
  ON public.combat_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = combat_state.session_id
      AND sessions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own combat state" ON public.combat_state;
CREATE POLICY "Users can manage own combat state"
  ON public.combat_state FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = combat_state.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS combat_state_session_id_idx ON public.combat_state(session_id);

-- ============================================================================
-- CAMPAIGN EMBEDDINGS (RAG - Rules & Lore)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.campaign_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_system TEXT, -- NEW: For system-specific RAG
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for campaign_embeddings
ALTER TABLE public.campaign_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own embeddings" ON public.campaign_embeddings;
CREATE POLICY "Users can view own embeddings"
  ON public.campaign_embeddings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own embeddings" ON public.campaign_embeddings;
CREATE POLICY "Users can create own embeddings"
  ON public.campaign_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Vector similarity search index (HNSW for better performance)
CREATE INDEX IF NOT EXISTS campaign_embeddings_vector_idx ON public.campaign_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- Indexes
CREATE INDEX IF NOT EXISTS campaign_embeddings_campaign_id_idx ON public.campaign_embeddings(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_embeddings_user_id_idx ON public.campaign_embeddings(user_id);

-- ============================================================================
-- FANTASY GROUNDS SYNC COMMANDS (Desktop App Communication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fg_commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL, -- 'roll_dice', 'update_hp', 'sync_character', etc.
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policies for fg_commands
ALTER TABLE public.fg_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own FG commands" ON public.fg_commands;
CREATE POLICY "Users can view own FG commands"
  ON public.fg_commands FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own FG commands" ON public.fg_commands;
CREATE POLICY "Users can create own FG commands"
  ON public.fg_commands FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own FG commands" ON public.fg_commands;
CREATE POLICY "Users can update own FG commands"
  ON public.fg_commands FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS fg_commands_user_id_idx ON public.fg_commands(user_id);
CREATE INDEX IF NOT EXISTS fg_commands_status_idx ON public.fg_commands(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS fg_commands_created_at_idx ON public.fg_commands(created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Vector similarity search for RAG
CREATE OR REPLACE FUNCTION match_campaign_embeddings(
  query_embedding VECTOR(1536),
  query_campaign_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.campaign_embeddings
  WHERE campaign_id = query_campaign_id
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_characters_updated_at ON public.characters;
CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_combat_state_updated_at ON public.combat_state;
CREATE TRIGGER update_combat_state_updated_at
  BEFORE UPDATE ON public.combat_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER: Auto-sync character game_system from campaign
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_character_game_system()
RETURNS TRIGGER AS $$
BEGIN
  -- Get campaign's game system
  SELECT game_system INTO NEW.game_system
  FROM public.campaigns
  WHERE id = NEW.campaign_id;

  -- If campaign not found, raise error
  IF NEW.game_system IS NULL THEN
    RAISE EXCEPTION 'Campaign not found: %', NEW.campaign_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS character_game_system_sync ON public.characters;
CREATE TRIGGER character_game_system_sync
  BEFORE INSERT OR UPDATE OF campaign_id ON public.characters
  FOR EACH ROW 
  EXECUTE FUNCTION sync_character_game_system();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage bucket for campaign PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-pdfs', 'campaign-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can only upload to their own folder
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'campaign-pdfs' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policy: Users can only read their own files
DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'campaign-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policy: Users can delete their own files
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'campaign-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create storage bucket for character avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('character-avatars', 'character-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for avatars (public read, user write)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'character-avatars');

DROP POLICY IF EXISTS "Users can upload avatars to own folder" ON storage.objects;
CREATE POLICY "Users can upload avatars to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'character-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add after the trigger section

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON COLUMN campaigns.game_system IS 
  'Game system identifier (ADD1E, ADD2E, 3_5E, 4E, 5E_2014, 5E_2024, PATHFINDER, PATHFINDER_2E, DCC, TOR1E, TOR2E, CYBERPUNK_2020)';

COMMENT ON COLUMN campaigns.fg_campaign_id IS 
  'Fantasy Grounds campaign internal ID for sync tracking';

COMMENT ON COLUMN campaigns.fg_ruleset IS 
  'Fantasy Grounds ruleset code (e.g., "2E", "5E", "PFRPG")';

COMMENT ON COLUMN campaigns.source IS 
  'How campaign was created: "web" (manual) or "fg_import" (from Fantasy Grounds)';

COMMENT ON COLUMN characters.game_data_stats IS 
  'Ability scores/stats as JSONB (e.g., {"STR": 16, "DEX": 14})';

COMMENT ON COLUMN characters.game_data_combat IS 
  'Combat-related data as JSONB (e.g., {"ac": 15, "thac0": 10, "attack_bonus": 5})';

COMMENT ON COLUMN characters.fg_raw_data IS 
  'Raw Fantasy Grounds XML data stored as JSONB for debugging';

-- ============================================================================
-- SEED DATA (Optional - for testing)
-- ============================================================================

-- This will be populated after a user signs in
-- Example campaigns and characters can be added via the app UI