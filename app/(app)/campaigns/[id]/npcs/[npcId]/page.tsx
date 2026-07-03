import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NpcDetailPage } from '@/components/npc/NpcDetailPage';
import type { Npc } from '@/lib/types/npc';

interface Props {
  params: Promise<{ id: string; npcId: string }>;
}

export default async function NpcDetailRoute({ params }: Props) {
  const { id, npcId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, owner_id')
    .eq('id', id)
    .single();

  if (!campaign || campaign.owner_id !== user?.id) notFound();

  const { data: npc } = await supabase
    .from('npcs')
    .select('*')
    .eq('id', npcId)
    .eq('campaign_id', id)
    .single();

  if (!npc) notFound();

  return (
    <NpcDetailPage
      campaignId={id}
      campaignName={campaign.name as string}
      npc={npc as Npc}
    />
  );
}
