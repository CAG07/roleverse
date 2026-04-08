import { createClient } from '@/lib/supabase/server';
import {
  DashboardPage,
  type SessionSummary,
  type CharacterSummary,
} from '@/components/dashboard/DashboardPage';

export default async function DashboardRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const uid = user!.id;
  const userName =
    (user!.user_metadata?.full_name as string | undefined) ?? user!.email ?? 'Adventurer';

  // Fetch counts and recents in parallel
  const [
    { count: campaignsCount },
    { count: sessionsCount },
    { count: charactersCount },
    { data: recentCampaignsRaw },
    { data: recentSessionsRaw },
    { data: recentCharactersRaw },
  ] = await Promise.all([
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', uid),
    supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid),
    supabase
      .from('characters')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid),
    supabase
      .from('campaigns')
      .select('id, name, description, game_system, created_at, updated_at')
      .eq('owner_id', uid)
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase
      .from('sessions')
      .select('id, campaign_id, started_at, ended_at, campaigns(name)')
      .eq('user_id', uid)
      .order('started_at', { ascending: false })
      .limit(3),
    supabase
      .from('characters')
      .select('id, name, class, level, campaign_id, campaigns(name)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const recentSessions: SessionSummary[] = (recentSessionsRaw ?? []).map((s) => ({
    id: s.id,
    campaign_id: s.campaign_id,
    campaign_name: ((s.campaigns as unknown as { name: string } | null)?.name) ?? null,
    started_at: s.started_at,
    ended_at: s.ended_at,
  }));

  const recentCharacters: CharacterSummary[] = (recentCharactersRaw ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    class: c.class,
    level: c.level,
    campaign_id: c.campaign_id,
    campaign_name: ((c.campaigns as unknown as { name: string } | null)?.name) ?? null,
  }));

  return (
    <DashboardPage
      userName={userName}
      stats={{
        campaigns: campaignsCount ?? 0,
        sessions: sessionsCount ?? 0,
        characters: charactersCount ?? 0,
      }}
      recentCampaigns={recentCampaignsRaw ?? []}
      recentSessions={recentSessions}
      recentCharacters={recentCharacters}
    />
  );
}

