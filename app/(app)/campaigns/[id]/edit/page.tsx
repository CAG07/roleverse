import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditCampaignPage } from '@/components/campaign/EditCampaignPage';

interface EditCampaignRouteProps {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignRoute({ params }: EditCampaignRouteProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, description, module_description, game_system, owner_id')
    .eq('id', id)
    .single();

  if (!campaign || campaign.owner_id !== user?.id) {
    notFound();
  }

  return (
    <EditCampaignPage
      id={id}
      initialName={campaign.name as string}
      initialDescription={(campaign.description as string | null) ?? ''}
      initialModuleDescription={(campaign.module_description as string | null) ?? ''}
      initialGameSystem={campaign.game_system as string}
    />
  );
}
