// app/api/sessions/[sessionId]/end/route.ts
// POST /api/sessions/[sessionId]/end — mark a session as ended

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  // --- Auth ---
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- End the session (RLS enforces ownership) ---
  const { error } = await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .is('ended_at', null); // only end if not already ended

  if (error) {
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
