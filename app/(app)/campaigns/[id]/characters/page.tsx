import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CharactersListPage } from '@/components/character/CharactersListPage';

interface Props { params: Promise<{ id: string }>; }

export default async function CharactersRoute({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, game_system, owner_id')
    .eq('id', id)
    .single();

  if (!campaign || campaign.owner_id !== user?.id) notFound();

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, class, race, level, hp, max_hp, game_system, updated_at')
    .eq('campaign_id', id)
    .order('updated_at', { ascending: false });

  return (
    <CharactersListPage
      campaignId={id}
      campaignName={campaign.name}
      gameSystem={campaign.game_system}
      characters={characters ?? []}
    />
  );
}
