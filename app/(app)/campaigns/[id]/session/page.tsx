import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SessionPageClient from '@/components/session/SessionPageClient';
import type { Character, TranscriptEntry } from '@/lib/types/session';

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

  // Fetch characters for this campaign
  const { data: charactersRaw } = await supabase
    .from('characters')
    .select('id, user_id, campaign_id, name, game_system, level, class, race, hp, max_hp, game_data_stats, game_data_combat, equipment, created_at')
    .eq('campaign_id', id);

  const characters: Character[] = (charactersRaw ?? []) as Character[];

  // Resume active session if one exists, only create a new one if none is found
  let sessionId: string;
  let initialTranscript: TranscriptEntry[] = [];

  const { data: activeSession } = await supabase
    .from('sessions')
    .select('id, transcript')
    .eq('campaign_id', id)
    .eq('user_id', user!.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSession) {
    sessionId = activeSession.id as string;
    initialTranscript = ((activeSession.transcript as TranscriptEntry[] | null) ?? []).slice(-200);
  } else {
    const { data: newSession } = await supabase
      .from('sessions')
      .insert({ campaign_id: id, user_id: user!.id })
      .select('id')
      .single();

    if (!newSession) redirect(`/campaigns/${id}`);
    sessionId = newSession.id as string;
  }

  return (
    <SessionPageClient
      sessionId={sessionId}
      campaignId={id}
      campaignName={campaign.name}
      gameSystem={campaign.game_system}
      characters={characters}
      initialTranscript={initialTranscript}
    />
  );
}
