import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CharacterDetailPage } from '@/components/character/CharacterDetailPage';
import { CHARACTER_SHEET_COLUMNS } from '@/lib/character/characterSheetColumns';

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
      .select(`${CHARACTER_SHEET_COLUMNS}, user_id`)
      .eq('id', charId)
      .eq('campaign_id', id)
      .single(),
  ]);

  if (!campaign || campaign.owner_id !== user?.id) notFound();
  if (!character) notFound();

  let funnelParty: { id: string; name: string; occupation?: string; hp?: { current: number; max: number }; ac?: number }[] | undefined;

  if (character.game_system === 'DCC' && character.level === 0) {
    const { data: siblings } = await supabase
      .from('characters')
      .select('id, name, hp, max_hp, game_data_stats, game_data_combat')
      .eq('campaign_id', id)
      .eq('user_id', character.user_id as string)
      .eq('level', 0)
      .neq('id', charId);

    funnelParty = (siblings ?? []).map((s) => {
      const stats = (s.game_data_stats as Record<string, unknown> | null) ?? {};
      const combat = (s.game_data_combat as Record<string, unknown> | null) ?? {};
      return {
        id: s.id as string,
        name: s.name as string,
        occupation: (stats.occupation as string | undefined) || undefined,
        hp: s.hp != null && s.max_hp != null ? { current: s.hp as number, max: s.max_hp as number } : undefined,
        ac: combat.ac as number | undefined,
      };
    });
  }

  return (
    <CharacterDetailPage
      campaignId={id}
      campaignName={campaign.name as string}
      character={character}
      funnelParty={funnelParty}
    />
  );
}
