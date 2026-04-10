import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CharacterDetailPage } from '@/components/character/CharacterDetailPage';

interface Props {
  params: Promise<{ id: string; charId: string }>;
}

export default async function CharacterDetailRoute({ params }: Props) {
  const { id, charId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: campaign }, { data: character }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, name, game_system, owner_id')
      .eq('id', id)
      .single(),
    supabase
      .from('characters')
      .select(
        'id, name, class, race, level, hp, max_hp, notes, game_system, game_data_stats, game_data_combat, game_data_saves, game_data_skills, equipment, spells, updated_at'
      )
      .eq('id', charId)
      .eq('campaign_id', id)
      .single(),
  ]);

  if (!campaign || campaign.owner_id !== user?.id) notFound();
  if (!character) notFound();

  return (
    <CharacterDetailPage
      campaignId={id}
      campaignName={campaign.name as string}
      character={character}
    />
  );
}
