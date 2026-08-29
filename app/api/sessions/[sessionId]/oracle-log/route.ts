// app/api/sessions/[sessionId]/oracle-log/route.ts
// POST /api/sessions/[sessionId]/oracle-log — append a zero-AI Oracle-panel
// result (Quick Oracle, Scale Check, Plot Seed, Story Draw, generators) to a
// session's transcript as a role: 'oracle' entry, the same shape "My Oracle"
// consultations already use (app/api/campaigns/[id]/oracle/consult/route.ts).
// No Anthropic call, no rate limit — these tools are free/local, same
// reasoning as MAX_ORACLE_CONSULTS_PER_DAY only gating the BYOO path
// (see lib/oracle/consult-oracle.ts).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface OracleLogRequestBody {
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

  let body: OracleLogRequestBody;
  try {
    body = (await request.json()) as OracleLogRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: 'Missing required field: content' }, { status: 400 });
  }

  const { error: transcriptError } = await supabase.rpc('append_session_transcript', {
    p_session_id: sessionId,
    p_entries: [{ role: 'oracle', content, timestamp: new Date().toISOString() }],
  });

  if (transcriptError) {
    console.warn('[oracle-log] Failed to save oracle log entry:', transcriptError);
    return NextResponse.json({ error: 'Failed to save oracle log entry' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
