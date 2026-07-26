// app/api/sessions/[sessionId]/message/route.ts
// POST /api/sessions/[sessionId]/message — route a player message to the correct agent via Haiku,
// then stream the response as Server-Sent Events.

import { NextRequest, NextResponse } from 'next/server';

import { streamGameMasterAgent } from '@/lib/mcp/agents/game-master';
import { streamLoreKeeperAgent } from '@/lib/mcp/agents/lore-keeper';
import { streamRulesArbiterAgent } from '@/lib/mcp/agents/rules-arbiter';
import { routeMessage } from '@/lib/mcp/coordinator';
import { buildPartyContext } from '@/lib/mcp/context/party-context';
import { registerRollDiceTool } from '@/lib/mcp/tools/roll-dice';
import type { AgentMessage, AgentStreamResult, MCPContext } from '@/lib/mcp/types';
import { formatSSE } from '@/lib/sse';
import { createClient } from '@/lib/supabase/server';

// Register MCP tools on module load (runs once per cold start)
registerRollDiceTool();

interface MessageRequestBody {
  message: string;
  conversationHistory?: AgentMessage[];
}

export async function POST(
  request: NextRequest,
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

  // --- Look up session (RLS enforces ownership) ---
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, campaign_id, user_id, ended_at')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.ended_at) {
    return NextResponse.json({ error: 'Session has ended' }, { status: 400 });
  }

  // --- Look up campaign for gameSystem ---
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, game_system')
    .eq('id', session.campaign_id)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // --- Parse body ---
  let body: MessageRequestBody;
  try {
    body = (await request.json()) as MessageRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, conversationHistory } = body;
  if (!message) {
    return NextResponse.json({ error: 'Missing required field: message' }, { status: 400 });
  }

  // --- Route via Haiku coordinator + resolve party context, once, in parallel ---
  // (runs before stream opens; party context is passed to whichever agent handles
  // the message so routing doesn't determine whether the agent can see the party)
  const [agentRole, partyContext] = await Promise.all([
    routeMessage(message),
    buildPartyContext(session.campaign_id as string),
  ]);
  console.log(`[router] "${message.slice(0, 80)}" -> ${agentRole}`);

  // --- Build MCP context ---
  const mcpContext: MCPContext = {
    campaignId: session.campaign_id as string,
    gameSystem: campaign.game_system as string,
    userId: user.id,
  };

  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const onAbort = () => {
        cancelled = true;
        try { controller.close(); } catch { /* ignore */ }
      };
      request.signal.addEventListener('abort', onAbort);

      function emit(event: string, data: unknown) {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(formatSSE(event, data)));
        } catch {
          cancelled = true;
        }
      }

      let fullContent = '';

      try {
        emit('agent_type', { agentType: agentRole });

        // --- Select streaming generator ---
        let agentGen: AsyncGenerator<string, AgentStreamResult, undefined>;
        switch (agentRole) {
          case 'game_master':
            agentGen = streamGameMasterAgent(
              message,
              mcpContext,
              conversationHistory ?? [],
              partyContext
            );
            break;
          case 'rules_arbiter':
            agentGen = streamRulesArbiterAgent(
              message,
              mcpContext,
              conversationHistory ?? [],
              partyContext
            );
            break;
          case 'lore_keeper':
            agentGen = streamLoreKeeperAgent(
              message,
              mcpContext,
              conversationHistory ?? [],
              partyContext
            );
            break;
          default:
            emit('error', { error: `Unknown agent role: "${agentRole}"` });
            return;
        }

        // --- Stream tokens (manual iteration to capture the generator's return value) ---
        const iterator = agentGen[Symbol.asyncIterator]();
        let step = await iterator.next();
        while (!step.done) {
          fullContent += step.value;
          emit('token', { text: step.value });
          step = await iterator.next();
        }

        const result = step.value;
        if (result.flaggedNpcs?.length) {
          for (const npc of result.flaggedNpcs) {
            emit('npc_flag', { npc });
          }
        }

        // --- Persist transcript ---
        // Appended atomically via RPC (transcript = transcript || entries in a single
        // UPDATE) instead of SELECT-then-UPDATE, so overlapping requests for the same
        // session (double-submit, multiple tabs) can't silently overwrite each other's turn.
        try {
          const now = new Date().toISOString();
          await supabase.rpc('append_session_transcript', {
            p_session_id: sessionId,
            p_entries: [
              { role: 'player', content: message, timestamp: now },
              { role: 'agent', agentType: agentRole, content: fullContent, timestamp: now },
            ],
          });
        } catch (transcriptErr) {
          console.warn('[transcript] Failed to save transcript entry:', transcriptErr);
        }

        emit('done', {});
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Internal server error';
        console.error('[agent stream] failed:', err);

        if (fullContent) {
          try {
            const now = new Date().toISOString();
            await supabase.rpc('append_session_transcript', {
              p_session_id: sessionId,
              p_entries: [
                { role: 'player', content: message, timestamp: now },
                {
                  role: 'agent',
                  agentType: agentRole,
                  content: fullContent + ' [truncated]',
                  timestamp: now,
                },
              ],
            });
          } catch {
            // swallow — already in error path
          }
        }

        emit('error', { error: errMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
