// app/api/sessions/[sessionId]/end/route.ts
// POST /api/sessions/[sessionId]/end — mark a session as ended, then generate a summary.
// ended_at is set first so the session ends even if summary generation fails.
// Every session this call ends gets a summary (normally just one; more only if
// duplicates were open, e.g. from two tabs), so none is left without a recap.

import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGameSystem } from '@/lib/game-systems/registry';
import { generateSessionSummary } from '@/lib/sessions/generate-summary';
import type { TranscriptEntry } from '@/lib/types/session';

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
    .select('campaign_id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('game_system, ai_assist_enabled')
    .eq('id', session.campaign_id)
    .single();

  // Step 1: end all active sessions for this campaign (handles duplicates cleanly).
  // Returns the rows it ended, so an already-ended session (a double click) isn't
  // summarized twice.
  const { data: endedSessions, error: endError } = await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('campaign_id', session.campaign_id)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .select('id, transcript');

  if (endError) {
    return NextResponse.json({ error: endError.message }, { status: 500 });
  }

  // Step 2: generate the summary after the response is sent — must not block the
  // response, but MUST still run to completion (a bare un-awaited promise has no
  // such guarantee on Vercel's serverless runtime; after() does). NPC rostering
  // happens live during play via the flagNpc tool, not at session end.
  //
  // Skipped entirely when AI Assist is off: a journal-mode session's transcript
  // is the player's own freeform writing (see JournalPanel.tsx), never something
  // sent to Claude on their behalf — that's the whole point of turning AI Assist
  // off, not just hiding the chat window.
  const aiAssistEnabled = (campaign?.ai_assist_enabled as boolean | null) ?? true;
  if (aiAssistEnabled && endedSessions && endedSessions.length > 0) {
    after(async () => {
      const systemId = (campaign?.game_system as string | undefined) ?? '';
      const gameSystemName = getGameSystem(systemId)?.name ?? systemId;

      for (const ended of endedSessions) {
        const transcript: TranscriptEntry[] = Array.isArray(ended.transcript)
          ? (ended.transcript as TranscriptEntry[])
          : [];

        try {
          const summary = await generateSessionSummary(transcript, gameSystemName);

          await supabase
            .from('sessions')
            .update({ summary, summary_generated_at: new Date().toISOString() })
            .eq('id', ended.id);
        } catch (err) {
          // Summary is a nice-to-have. Log and continue — session already ended above.
          // The Game Master falls back to this session's transcript when it has no summary.
          console.error(`[session-end] Summary generation failed for ${ended.id}:`, err);
        }
      }
    });
  }

  return NextResponse.json({ success: true });
}
