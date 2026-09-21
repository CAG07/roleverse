import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditCharacterPage } from '@/components/character/EditCharacterPage';

interface Props {
  params: Promise<{ id: string; charId: string }>;
}

export default async function EditCharacterRoute({ params }: Props) {
  const { id, charId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: campaign }, { data: character }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, name, owner_id')
      .eq('id', id)
      .single(),
    supabase
      .from('characters')
      .select(
        'id, name, class, race, level, hp, max_hp, notes, game_system, game_data_stats, game_data_combat, game_data_saves, game_data_skills'
      )
      .eq('id', charId)
      .eq('campaign_id', id)
      .single(),
  ]);

  if (!campaign || campaign.owner_id !== user?.id) notFound();
  if (!character) notFound();

  // Legacy fallback: 5E's "Features & Traits" field used to be stored under
  // the `features` key before it was renamed to `featuresTraits` (see
  // lib/character/assembleCharacterData.ts for why). Surface old data under
  // the new key here too, so the edit form doesn't show it as blank —
  // nothing under the old key is deleted, this is read-only until re-saved.
  const rawStats = (character.game_data_stats as Record<string, unknown> | null) ?? {};
  const gameDataStats =
    rawStats.featuresTraits == null && Array.isArray(rawStats.features)
      ? { ...rawStats, featuresTraits: rawStats.features }
      : rawStats;

  return (
    <EditCharacterPage
      campaignId={id}
      campaignName={campaign.name as string}
      characterId={charId}
      gameSystem={character.game_system as string}
      initialName={character.name as string}
      initialRace={(character.race as string | null) ?? ''}
      initialClass={(character.class as string | null) ?? ''}
      initialLevel={(character.level as number | null) ?? 1}
      initialHp={(character.hp as number | null) ?? 0}
      initialMaxHp={(character.max_hp as number | null) ?? 0}
      initialNotes={(character.notes as string | null) ?? ''}
      initialGameData={{
        game_data_stats: gameDataStats,
        game_data_combat: character.game_data_combat as Record<string, unknown> | null,
        game_data_saves: character.game_data_saves as Record<string, unknown> | null,
        game_data_skills: character.game_data_skills as Record<string, unknown> | null,
      }}
    />
  );
}
