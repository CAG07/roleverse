import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NpcForm } from '@/components/npc/NpcForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NewNpcPage({ params }: Props) {
  const { id } = await params;
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

  return (
    <NpcForm
      campaignId={id}
      campaignName={campaign.name as string}
    />
  );
}
