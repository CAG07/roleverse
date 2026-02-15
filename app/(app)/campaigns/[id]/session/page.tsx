import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SessionPageClient from '@/components/session/SessionPageClient';

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
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

  return (
    <SessionPageClient
      campaignId={id}
      campaignName={campaign.name}
      gameSystem={campaign.game_system}
    />
  );
}
