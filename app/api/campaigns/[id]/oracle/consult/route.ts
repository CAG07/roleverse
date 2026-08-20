// app/api/campaigns/[id]/oracle/consult/route.ts
// POST — "My Oracle" consultation. Rate-limited (rolling daily cap, real
// Anthropic API cost), retrieval-grounded against the campaign's own
// uploaded oracle-reference content (source_type = 'oracle_ref'), and
// appended to the given session's transcript as a role: 'oracle' entry —
// see lib/oracle/consult-oracle.ts for the grounding/tool-use design.
//
// This is deliberately NOT routed through lib/mcp/coordinator.ts — it never
// touches routeMessage() or AgentRole. See consult-oracle.ts's header.

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { runOracleConsult, MAX_ORACLE_CONSULTS_PER_DAY } from '@/lib/oracle/consult-oracle';

type RouteParams = { params: Promise<{ id: string }> };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const RESET_WINDOW_MS = 24 * 60 * 60 * 1000;

async function authAndCampaign(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401, user: null, supabase: null, oracleState: null };
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, owner_id, oracle_state, oracle_consult_count, oracle_consult_reset_at')
    .eq('id', campaignId)
    .single();

  if (!campaign || campaign.owner_id !== user.id) {
    return { error: 'Campaign not found', status: 404, user: null, supabase: null, oracleState: null };
  }

  return {
    error: null,
    status: 200,
    user,
    supabase,
    oracleState: (campaign.oracle_state as string | null) ?? null,
    currentCount: (campaign.oracle_consult_count as number) ?? 0,
    resetAt: campaign.oracle_consult_reset_at as string,
  };
}

/** Soft anti-abuse guard, not a security boundary — fetch-then-conditional-update
 *  is good enough for a single-owner campaign's occasional consultations. Rolling
 *  daily window: resets the counter (and the window) once >24h have elapsed. */
async function tryConsumeConsult(
  supabase: Supabase,
  campaignId: string,
  currentCount: number,
  resetAt: string
): Promise<boolean> {
  const windowExpired = Date.now() - new Date(resetAt).getTime() > RESET_WINDOW_MS;
  const effectiveCount = windowExpired ? 0 : currentCount;
  if (effectiveCount >= MAX_ORACLE_CONSULTS_PER_DAY) return false;

  const { data } = await supabase
    .from('campaigns')
    .update({
      oracle_consult_count: effectiveCount + 1,
      oracle_consult_reset_at: windowExpired ? new Date().toISOString() : resetAt,
    })
    .eq('id', campaignId)
    .eq('oracle_consult_count', currentCount)
    .eq('oracle_consult_reset_at', resetAt)
    .select('id');

  return (data?.length ?? 0) > 0;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { error, status, user, supabase, oracleState, currentCount, resetAt } = await authAndCampaign(id);

  if (error || !user || !supabase) {
    return NextResponse.json({ error }, { status });
  }

  let body: { sessionId?: string; question?: string };
  try {
    body = (await request.json()) as { sessionId?: string; question?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.sessionId || !body.question?.trim()) {
    return NextResponse.json({ error: 'sessionId and question are required' }, { status: 400 });
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('id, campaign_id, user_id')
    .eq('id', body.sessionId)
    .eq('user_id', user.id)
    .single();
  if (!session || session.campaign_id !== id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const consumed = await tryConsumeConsult(supabase, id, currentCount ?? 0, resetAt ?? new Date().toISOString());
  if (!consumed) {
    return NextResponse.json(
      {
        error: `This campaign has reached its limit of ${MAX_ORACLE_CONSULTS_PER_DAY} oracle consultations for today. Try again later, or use Quick Oracle instead.`,
      },
      { status: 429 }
    );
  }

  try {
    const result = await runOracleConsult({
      campaignId: id,
      question: body.question.trim(),
      oracleState,
    });

    const now = new Date().toISOString();
    const { error: transcriptError } = await supabase.rpc('append_session_transcript', {
      p_session_id: body.sessionId,
      p_entries: [
        {
          role: 'oracle',
          content: `Q: ${body.question.trim()}\nA: ${result.answer}`,
          timestamp: now,
        },
      ],
    });
    if (transcriptError) {
      console.error('[oracle consult] Failed to append transcript entry:', transcriptError.message);
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Oracle consultation failed' },
      { status: 502 }
    );
  }
}
