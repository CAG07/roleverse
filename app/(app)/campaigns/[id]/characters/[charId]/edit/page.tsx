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
      .select('id, name, class, race, level, hp, max_hp, notes')
      .eq('id', charId)
      .eq('campaign_id', id)
      .single(),
  ]);

  if (!campaign || campaign.owner_id !== user?.id) notFound();
  if (!character) notFound();

  return (
    <EditCharacterPage
      campaignId={id}
      campaignName={campaign.name as string}
      characterId={charId}
      initialName={character.name as string}
      initialRace={(character.race as string | null) ?? ''}
      initialClass={(character.class as string | null) ?? ''}
      initialLevel={(character.level as number | null) ?? 1}
      initialHp={(character.hp as number | null) ?? 0}
      initialMaxHp={(character.max_hp as number | null) ?? 0}
      initialNotes={(character.notes as string | null) ?? ''}
    />
  );
}
