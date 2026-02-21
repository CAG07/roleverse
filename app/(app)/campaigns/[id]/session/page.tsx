import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SessionPageClient from '@/components/session/SessionPageClient';
import type { PartyMember, Character } from '@/lib/types/session';

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

type ProfileData = { full_name?: string | null } | null;

function extractDisplayName(profiles: ProfileData | ProfileData[]): string | null {
  if (Array.isArray(profiles)) {
    return (profiles[0] as ProfileData)?.full_name ?? null;
  }
  return profiles?.full_name ?? null;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (!campaign || campaign.owner_id !== user?.id) {
    notFound();
  }

  // Fetch party members with profile display names
  const { data: membersRaw } = await supabase
    .from('campaign_members')
    .select('id, user_id, campaign_id, role, joined_at, profiles(full_name)')
    .eq('campaign_id', id);

  const partyMembers: PartyMember[] = (membersRaw ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    campaign_id: m.campaign_id,
    role: m.role as 'dm' | 'player',
    joined_at: m.joined_at,
    display_name: extractDisplayName(m.profiles as ProfileData | ProfileData[]),
  }));

  // Fetch characters for this campaign
  const { data: charactersRaw } = await supabase
    .from('characters')
    .select('id, user_id, campaign_id, name, game_system, level, class, race, hp, max_hp, game_data_stats, game_data_combat, created_at')
    .eq('campaign_id', id);

  const characters: Character[] = (charactersRaw ?? []) as Character[];

  return (
    <SessionPageClient
      campaignId={id}
      campaignName={campaign.name}
      gameSystem={campaign.game_system}
      partyMembers={partyMembers}
      characters={characters}
    />
  );
}
