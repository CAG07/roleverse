import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SessionPageClient from '@/components/session/SessionPageClient';
import type { Character, SceneMedia, TranscriptEntry } from '@/lib/types/session';
import { CHARACTER_SHEET_COLUMNS } from '@/lib/character/characterSheetColumns';

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
    .select(`${CHARACTER_SHEET_COLUMNS}, user_id, campaign_id, created_at`)
    .eq('campaign_id', id);

  const characters: Character[] = (charactersRaw ?? []) as Character[];

  // Resume active session if one exists, only create a new one if none is found
  let sessionId: string;
  let initialTranscript: TranscriptEntry[] = [];
  let initialSceneMedia: SceneMedia | null = null;

  const { data: activeSession } = await supabase
    .from('sessions')
    .select('id, transcript, scene_media')
    .eq('campaign_id', id)
    .eq('user_id', user!.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSession) {
    sessionId = activeSession.id as string;
    initialTranscript = ((activeSession.transcript as TranscriptEntry[] | null) ?? []).slice(-200);
    const storedScene = activeSession.scene_media as (Omit<SceneMedia, 'timestamp'> & { timestamp: string }) | null;
    initialSceneMedia = storedScene ? { ...storedScene, timestamp: new Date(storedScene.timestamp) } : null;
  } else {
    // Brand-new session — the Game Master fetches the prior session's recap itself
    // (lib/mcp/agents/game-master.ts) and opens with a narrated scene, so nothing
    // needs fetching here.
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
      initialSceneMedia={initialSceneMedia}
      aiAssistEnabled={(campaign.ai_assist_enabled as boolean | null) ?? true}
    />
  );
}
