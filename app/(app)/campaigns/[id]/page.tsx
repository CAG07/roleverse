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

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (!campaign || campaign.owner_id !== user?.id) {
    notFound();
  }

  let systemName = campaign.game_system as string;
  let systemDescription = '';
  try {
    const system = getGameSystem(campaign.game_system as string);
    systemName = system.name;
    systemDescription = system.description;
  } catch {
    // Use raw slug if system is not registered
  }

  return (
    <CampaignDetailPage
      id={id}
      name={campaign.name as string}
      description={campaign.description as string | null}
      systemName={systemName}
      systemDescription={systemDescription}
    />
  );
}
