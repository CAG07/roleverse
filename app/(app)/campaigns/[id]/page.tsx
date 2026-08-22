import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGameSystem } from '@/lib/game-systems/registry';
import { CampaignDetailPage } from '@/components/campaign/CampaignDetailPage';

interface CampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: campaign },
    { data: characters },
    { count: sessionCount },
  ] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', id).single(),
    supabase
      .from('characters')
      .select('id, name, class, race, level, hp, max_hp')
      .eq('campaign_id', id),
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', id),
  ]);

  if (!campaign || campaign.owner_id !== user?.id) {
    notFound();
  }

  let systemName = campaign.game_system as string;
  let systemDescription = '';
  const system = getGameSystem(campaign.game_system as string);
  if (system) {
    systemName = system.name;
    systemDescription = system.description;
  }

  // Active session — determines Start vs Resume button label
  const { data: activeSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('campaign_id', id)
    .eq('user_id', user!.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Last 5 sessions for history panel
  const { data: recentSessions } = await supabase
    .from('sessions')
    .select('id, started_at, ended_at, transcript')
    .eq('campaign_id', id)
    .eq('user_id', user!.id)
    .order('started_at', { ascending: false })
    .limit(5);

  return (
    <CampaignDetailPage
      id={id}
      name={campaign.name as string}
      description={campaign.description as string | null}
      moduleDescription={campaign.module_description as string | null}
      systemName={systemName}
      systemDescription={systemDescription}
      gameSystem={campaign.game_system as string}
      characters={characters ?? []}
      activeSession={activeSession ?? null}
      recentSessions={recentSessions ?? []}
      sessionCount={sessionCount ?? 0}
    />
  );
}
