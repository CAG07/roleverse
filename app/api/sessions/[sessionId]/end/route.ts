// app/api/sessions/[sessionId]/end/route.ts
// POST /api/sessions/[sessionId]/end — mark a session as ended, then generate a summary.
// ended_at is set first so the session ends even if summary generation fails.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGameSystem } from '@/lib/game-systems/registry';
import { generateSessionSummary } from '@/lib/sessions/generate-summary';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Load session and campaign in one pass
  const { data: session } = await supabase
    .from('sessions')
    .select('campaign_id, transcript')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('game_system')
    .eq('id', session.campaign_id)
    .single();

  // Step 1: end all active sessions for this campaign (handles duplicates cleanly)
  const { error: endError } = await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('campaign_id', session.campaign_id)
    .eq('user_id', user.id)
    .is('ended_at', null);

  if (endError) {
    return NextResponse.json({ error: endError.message }, { status: 500 });
  }

  // Step 2: attempt summary generation in the background — failure must not block the response
  void (async () => {
    try {
      const transcript = Array.isArray(session.transcript)
        ? (session.transcript as { role?: string; content?: string; agentType?: string; timestamp?: string }[])
        : [];

      const systemId = (campaign?.game_system as string | undefined) ?? '';
      const gameSystemName = getGameSystem(systemId)?.name ?? systemId;

      const summary = await generateSessionSummary(transcript, gameSystemName);

      await supabase
        .from('sessions')
        .update({ summary, summary_generated_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (err) {
      // Summary is a nice-to-have. Log and continue — session already ended above.
      console.error('[session-end] Summary generation failed:', err);
    }
  })();

  return NextResponse.json({ success: true });
}
