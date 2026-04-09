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
    { data: sessions, count: sessionCount },
  ] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', id).single(),
    supabase
      .from('characters')
      .select('id, name, class, race, level, hp, max_hp')
      .eq('campaign_id', id),
    supabase
      .from('sessions')
      .select('id, started_at, ended_at', { count: 'exact' })
      .eq('campaign_id', id)
      .order('started_at', { ascending: false })
      .limit(10),
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

  return (
    <CampaignDetailPage
      id={id}
      name={campaign.name as string}
      description={campaign.description as string | null}
      systemName={systemName}
      systemDescription={systemDescription}
      characters={characters ?? []}
      sessions={sessions ?? []}
      sessionCount={sessionCount ?? 0}
    />
  );
}
