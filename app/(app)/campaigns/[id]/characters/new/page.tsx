import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGameSystem } from '@/lib/game-systems/registry';
import { NewCharacterForm } from '@/components/character/NewCharacterForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NewCharacterRoute({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, game_system, owner_id')
    .eq('id', id)
    .single();

  if (!campaign || campaign.owner_id !== user?.id) notFound();

  const system = getGameSystem(campaign.game_system as string);

  return (
    <NewCharacterForm
      campaignId={id}
      campaignName={campaign.name as string}
      gameSystem={campaign.game_system as string}
      gameSystemName={system?.name ?? (campaign.game_system as string)}
    />
  );
}
