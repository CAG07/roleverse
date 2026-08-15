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

CREATE TABLE public.workshop_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  -- Prevents the exact failure mode the "no undisclosed affiliate
  -- relationship" policy rule exists to guard against: affiliate_url set
  -- while is_affiliate is false (link silently becomes affiliate, no badge
  -- shown), or the reverse (badge shown, link isn't actually affiliate).
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Matches the sessions table's owner-scoped RLS shape (auth.uid() = user_id),
-- not campaigns' owner_id — this row is personally owned, not campaign-scoped.
CREATE POLICY "Users can view own submissions"
  ON public.workshop_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own submissions"
  ON public.workshop_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.workshop_resources
  ADD CONSTRAINT workshop_resources_source_submission_fkey
  FOREIGN KEY (source_submission_id) REFERENCES public.workshop_submissions(id) ON DELETE SET NULL;

-- ============================================================================
-- Seed: curated resources named explicitly in docs/WORKSHOP.pdf, plus Humble
-- Bundle (a confirmed, currently-joinable affiliate program that frequently
-- runs TTRPG bundles — added per research into real affiliate options, not
-- invented). All rows ship with is_affiliate = false / affiliate_url = NULL:
-- no affiliate program has actually been joined yet, and this project does
-- not fabricate tracking links. Flip is_affiliate + set affiliate_url once a
-- real tracking link exists for a given program. game_systems values reuse
-- lib/game-systems/registry.ts's canonical IDs exactly; an empty array means
-- the resource isn't tied to one specific supported system.
-- ============================================================================

INSERT INTO public.workshop_resources (category, title, description, url, game_systems, is_partner) VALUES
  -- 3.1 Reference SRDs & Open Rules
  ('reference_srds', 'OSRIC', 'Old School Reference and Index Compilation — an OGL-licensed AD&D 1st and 2nd Edition-compatible ruleset, freely linkable with excerpts permitted under its license.', 'https://osric.com', ARRAY['ADD1E','ADD2E'], false),
  ('reference_srds', 'Basic Fantasy RPG', 'A free, OGL-licensed old-school fantasy RPG that openly welcomes community use.', 'https://basicfantasy.org', ARRAY[]::text[], false),
  ('reference_srds', 'Old School Essentials SRD', 'An OGL-licensed, B/X-compatible system reference document.', 'https://necroticgnome.com/pages/ose-srd', ARRAY[]::text[], false),
  ('reference_srds', 'D&D 5E System Reference Document (2014)', 'The official OGL-licensed 5E SRD published by Wizards of the Coast.', 'https://www.dndbeyond.com/sources/dnd/free-rules', ARRAY['5E_2014'], false),
  ('reference_srds', 'Pathfinder 1E & 2E SRDs', 'Paizo''s official System Reference Documents, published under OGL and Paizo''s Community Use Policy.', 'https://paizo.com/community/communityuse', ARRAY['PATHFINDER','PATHFINDER_2E'], false),
  ('reference_srds', 'Dungeon Crawl Classics SRD', 'Goodman Games'' OGL-licensed DCC system reference document.', 'https://goodman-games.com/dccrpg-srd/', ARRAY['DCC'], false),

  -- 3.2 World-Building Tools
  ('world_building', 'Kanka.io', 'A campaign wiki and worldbuilding/NPC management tool. RoleVerse has API integration planned.', 'https://kanka.io', ARRAY[]::text[], false),
  ('world_building', 'World Anvil', 'A worldbuilding platform with a strong TTRPG community.', 'https://worldanvil.com', ARRAY[]::text[], false),
  ('world_building', 'Notion TTRPG Templates', 'Community-created TTRPG campaign templates for Notion.', 'https://www.notion.so/templates/category/ttrpg', ARRAY[]::text[], false),
  ('world_building', 'Obsidian with TTRPG Plugins', 'The official Obsidian community plugin directory, including several built for TTRPG campaign notes.', 'https://obsidian.md/plugins', ARRAY[]::text[], false),

  -- 3.3 VTT Resources
  ('vtt_resources', 'Fantasy Grounds Unity', 'SmiteWorks'' official Fantasy Grounds site — RoleVerse''s primary VTT integration and a cooperative partner.', 'https://www.fantasygrounds.com', ARRAY[]::text[], true),
  ('vtt_resources', 'Fantasy Grounds Forge', 'The official Fantasy Grounds module marketplace.', 'https://forge.fantasygrounds.com', ARRAY[]::text[], true),
  ('vtt_resources', 'Fantasy Grounds Wiki', 'The official Fantasy Grounds documentation wiki.', 'https://fantasygroundsunity.atlassian.net/wiki', ARRAY[]::text[], true),
  ('vtt_resources', 'Fantasy Grounds Forums', 'The official Fantasy Grounds community forums.', 'https://www.fantasygrounds.com/forums/', ARRAY[]::text[], true),
  ('vtt_resources', 'Roll20', 'A browser-based virtual tabletop, secondary coverage for hybrid setups.', 'https://roll20.net', ARRAY[]::text[], false),
  ('vtt_resources', 'Foundry VTT', 'A self-hosted virtual tabletop, secondary coverage for hybrid setups.', 'https://foundryvtt.com', ARRAY[]::text[], false),
  ('vtt_resources', 'Owlbear Rodeo', 'A lightweight browser-based virtual tabletop, secondary coverage for hybrid setups.', 'https://www.owlbear.rodeo', ARRAY[]::text[], false),

  -- 3.4 Publisher Storefronts
  ('publisher_storefronts', 'DriveThruRPG', 'A general TTRPG storefront covering most systems, including legacy AD&D reprints.', 'https://www.drivethrurpg.com', ARRAY['ADD1E','ADD2E'], false),
  ('publisher_storefronts', 'D&D Beyond', 'The official storefront for D&D 5E (2014 & 2024).', 'https://www.dndbeyond.com', ARRAY['5E_2014','5E_2024'], false),
  ('publisher_storefronts', 'Paizo', 'The official storefront for Pathfinder 1E & 2E.', 'https://paizo.com', ARRAY['PATHFINDER','PATHFINDER_2E'], false),
  ('publisher_storefronts', 'Goodman Games Store', 'The official storefront for Dungeon Crawl Classics.', 'https://goodman-games.com/store/', ARRAY['DCC'], false),
  ('publisher_storefronts', 'Free League Publishing', 'The official storefront for The One Ring 1E & 2E.', 'https://freeleaguepublishing.com', ARRAY['TOR1E','TOR2E'], false),
  ('publisher_storefronts', 'R. Talsorian Games', 'The official storefront for Cyberpunk 2020.', 'https://rtalsoriangames.com', ARRAY['CYBERPUNK_2020'], false),
  ('publisher_storefronts', 'Humble Bundle', 'Frequently runs deeply-discounted TTRPG bundles across many systems.', 'https://www.humblebundle.com/books', ARRAY[]::text[], false),

  -- 3.5 Maps, Art & Generators
  ('maps_art_generators', 'Dyson Logos', 'A prolific dungeon cartographer whose maps are freely available under a CC license.', 'https://dysonlogos.blog', ARRAY[]::text[], false),
  ('maps_art_generators', 'One Page Dungeon Compendium', 'An annual community map collection, CC-licensed.', 'https://1pagedungeon.co', ARRAY[]::text[], false),
  ('maps_art_generators', 'Donjon', 'Free random generators for dungeons, NPCs, names, and calendars.', 'https://donjon.bin.sh', ARRAY[]::text[], false),
  ('maps_art_generators', 'Inkarnate', 'A map creation tool for TTRPG campaigns.', 'https://inkarnate.com', ARRAY[]::text[], false),
  ('maps_art_generators', 'Unsplash', 'CC0-licensed photography, useful for scene inspiration.', 'https://unsplash.com', ARRAY[]::text[], false),
  ('maps_art_generators', 'Pixabay', 'CC0-licensed photography, useful for scene inspiration.', 'https://pixabay.com', ARRAY[]::text[], false),

  -- 3.6 Community Spaces
  ('community_spaces', 'r/osr', 'The Old School Renaissance community on Reddit.', 'https://www.reddit.com/r/osr/', ARRAY['ADD1E','ADD2E'], false),
  ('community_spaces', 'Paizo Forums', 'The official Paizo community forums.', 'https://paizo.com/community/forums', ARRAY['PATHFINDER','PATHFINDER_2E'], false),
  ('community_spaces', 'Goodman Games Forums', 'The official Goodman Games community forums.', 'https://goodman-games.com/forums/', ARRAY['DCC'], false),
  ('community_spaces', 'RPG.net', 'A long-running general TTRPG discussion community.', 'https://forum.rpg.net', ARRAY[]::text[], false),
  ('community_spaces', 'r/DnD', 'The general D&D community on Reddit.', 'https://www.reddit.com/r/DnD/', ARRAY['5E_2014','5E_2024'], false),
  ('community_spaces', 'r/Pathfinder_RPG', 'The Pathfinder community on Reddit.', 'https://www.reddit.com/r/Pathfinder_RPG/', ARRAY['PATHFINDER','PATHFINDER_2E'], false);
