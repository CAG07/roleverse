// app/api/sessions/[sessionId]/message/route.ts
// POST /api/sessions/[sessionId]/message — route a player message to the correct agent via Haiku,
// then stream the response as Server-Sent Events.

import { NextRequest, NextResponse } from 'next/server';

import { streamEncounterBuilderAgent } from '@/lib/mcp/agents/encounter-builder';
import { streamLoreKeeperAgent } from '@/lib/mcp/agents/lore-keeper';
import { streamNarratorAgent } from '@/lib/mcp/agents/narrator';
import { streamNpcDialogueAgent } from '@/lib/mcp/agents/npc-dialogue';
import { streamRulesArbiterAgent } from '@/lib/mcp/agents/rules-arbiter';
import { routeMessage } from '@/lib/mcp/coordinator';
import { registerRollDiceTool } from '@/lib/mcp/tools/roll-dice';
import type { AgentMessage, AgentStreamResult, MCPContext } from '@/lib/mcp/types';
import { formatSSE } from '@/lib/sse';
import { createClient } from '@/lib/supabase/server';
import type { NpcProposal } from '@/lib/types/npc';

// Register MCP tools on module load (runs once per cold start)
registerRollDiceTool();

const PROPOSAL_START = '[NPC_PROPOSAL_START]';
const PROPOSAL_END = '[NPC_PROPOSAL_END]';

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

  // --- Route via Haiku coordinator (runs before stream opens) ---
  const agentRole = await routeMessage(message);
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
        try {
          controller.close();
        } catch {
          // ignore
        }
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

      // Accumulate full content server-side for transcript (includes proposal block if any)
      let fullContent = '';

      try {
        emit('agent_type', { agentType: agentRole });

        // --- Select streaming generator ---
        let agentGen: AsyncGenerator<string, AgentStreamResult, undefined>;
        switch (agentRole) {
          case 'narrator':
            agentGen = streamNarratorAgent(message, mcpContext, conversationHistory ?? []);
            break;
          case 'rules_arbiter':
            agentGen = streamRulesArbiterAgent(message, mcpContext, conversationHistory ?? []);
            break;
          case 'npc_dialogue':
            agentGen = streamNpcDialogueAgent(message, mcpContext, conversationHistory ?? []);
            break;
          case 'lore_keeper':
            agentGen = streamLoreKeeperAgent(message, mcpContext, conversationHistory ?? []);
            break;
          case 'encounter_builder':
            agentGen = streamEncounterBuilderAgent(message, mcpContext, conversationHistory ?? []);
            break;
          default:
            emit('error', { error: `Unknown agent role: "${agentRole}"` });
            controller.close();
            return;
        }

        // --- Stream tokens, with proposal-block interception for npc_dialogue ---
        const useProposalParsing = agentRole === 'npc_dialogue';
        let lookAheadBuffer = '';
        let inProposalBlock = false;
        let proposalBuffer = '';

        for await (const chunk of agentGen) {
          fullContent += chunk;

          if (!useProposalParsing) {
            emit('token', { text: chunk });
            continue;
          }

          if (inProposalBlock) {
            proposalBuffer += chunk;
            continue;
          }

          // Look-ahead buffering to detect [NPC_PROPOSAL_START] across chunk boundaries
          lookAheadBuffer += chunk;

          const startIdx = lookAheadBuffer.indexOf(PROPOSAL_START);
          if (startIdx !== -1) {
            if (startIdx > 0) emit('token', { text: lookAheadBuffer.slice(0, startIdx) });
            inProposalBlock = true;
            proposalBuffer = lookAheadBuffer.slice(startIdx + PROPOSAL_START.length);
            lookAheadBuffer = '';
            continue;
          }

          // Flush safe portion — hold back the longest suffix that could be a prefix of the marker
          let holdLen = 0;
          for (let len = Math.min(lookAheadBuffer.length, PROPOSAL_START.length - 1); len > 0; len--) {
            if (PROPOSAL_START.startsWith(lookAheadBuffer.slice(-len))) {
              holdLen = len;
              break;
            }
          }
          const safeLen = lookAheadBuffer.length - holdLen;
          if (safeLen > 0) {
            emit('token', { text: lookAheadBuffer.slice(0, safeLen) });
            lookAheadBuffer = lookAheadBuffer.slice(safeLen);
          }
        }

        // Flush any remaining look-ahead buffer after stream ends
        if (lookAheadBuffer) {
          emit('token', { text: lookAheadBuffer });
        }

        // --- Parse and emit proposal if found ---
        if (inProposalBlock) {
          const endIdx = proposalBuffer.indexOf(PROPOSAL_END);
          const rawJson = endIdx !== -1
            ? proposalBuffer.slice(0, endIdx)
            : proposalBuffer;

          try {
            const parsed = JSON.parse(rawJson.trim()) as NpcProposal;
            if (parsed.kind === 'append_facts' && parsed.facts_to_add) {
              const now = new Date().toISOString();
              parsed.facts_to_add = parsed.facts_to_add.map((f) => ({
                ...f,
                learned_in_session: f.learned_in_session ?? sessionId,
                learned_at: f.learned_at ?? now,
              }));
            }
            emit('proposal', parsed);
          } catch {
            // Malformed proposal — ignore, don't break the response
          }

          // Defensively emit any text after [NPC_PROPOSAL_END]
          if (endIdx !== -1) {
            const afterProposal = proposalBuffer.slice(endIdx + PROPOSAL_END.length).trim();
            if (afterProposal) emit('token', { text: afterProposal });
          }
        }

        // --- Persist transcript (non-blocking — failure logs but does not block the response) ---
        try {
          const { data: currentSession } = await supabase
            .from('sessions')
            .select('transcript')
            .eq('id', sessionId)
            .single();

          const currentTranscript = (currentSession?.transcript as unknown[]) ?? [];
          const now = new Date().toISOString();
          const transcriptContent =
            agentRole === 'npc_dialogue'
              ? fullContent.replace(/\[NPC_PROPOSAL_START\][\s\S]*?\[NPC_PROPOSAL_END\]/g, '').trim()
              : fullContent;

          await supabase
            .from('sessions')
            .update({
              transcript: [
                ...currentTranscript,
                { role: 'player', content: message, timestamp: now },
                { role: 'agent', agentType: agentRole, content: transcriptContent, timestamp: now },
              ],
            })
            .eq('id', sessionId);
        } catch (transcriptErr) {
          console.warn('[transcript] Failed to save transcript entry:', transcriptErr);
        }

        emit('done', {});
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Internal server error';
        console.error('[agent stream] failed:', err);

        // Save whatever partial content was accumulated
        if (fullContent) {
          try {
            const { data: currentSession } = await supabase
              .from('sessions')
              .select('transcript')
              .eq('id', sessionId)
              .single();
            const currentTranscript = (currentSession?.transcript as unknown[]) ?? [];
            const now = new Date().toISOString();
            await supabase
              .from('sessions')
              .update({
                transcript: [
                  ...currentTranscript,
                  { role: 'player', content: message, timestamp: now },
                  { role: 'agent', agentType: agentRole, content: fullContent + ' [truncated]', timestamp: now },
                ],
              })
              .eq('id', sessionId);
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
