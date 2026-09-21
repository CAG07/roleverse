// app/api/sessions/[sessionId]/journal/route.ts
// POST /api/sessions/[sessionId]/journal — append a freeform journal entry to a
// session's transcript. Used by JournalPanel when a campaign's AI Assist is off:
// no agent routing, no Anthropic call, just a plain player-authored entry using
// the same transcript shape ChatWindow already writes (role: 'player'), via the
// same append_session_transcript RPC the message route uses — so session logs,
// summaries, and exports need no changes to read a journal-mode session.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface JournalRequestBody {
  content: string;
}

export async function POST(
  request: NextRequest,
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

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, ended_at')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.ended_at) {
    return NextResponse.json({ error: 'Session has ended' }, { status: 400 });
  }

  let body: JournalRequestBody;
  try {
    body = (await request.json()) as JournalRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: 'Missing required field: content' }, { status: 400 });
  }

  const { error: transcriptError } = await supabase.rpc('append_session_transcript', {
    p_session_id: sessionId,
    p_entries: [{ role: 'player', content, timestamp: new Date().toISOString() }],
  });

  if (transcriptError) {
    console.warn('[journal] Failed to save journal entry:', transcriptError);
    return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
