// app/api/sessions/[sessionId]/message/route.ts
// POST /api/sessions/[sessionId]/message — route a player message to the correct agent via Haiku

import { NextRequest, NextResponse } from 'next/server';

import { runEncounterBuilderAgent } from '@/lib/mcp/agents/encounter-builder';
import { runLoreKeeperAgent } from '@/lib/mcp/agents/lore-keeper';
import { runNarratorAgent } from '@/lib/mcp/agents/narrator';
import { runNpcDialogueAgent } from '@/lib/mcp/agents/npc-dialogue';
import { runRulesArbiterAgent } from '@/lib/mcp/agents/rules-arbiter';
import { routeMessage } from '@/lib/mcp/coordinator';
import { registerRollDiceTool } from '@/lib/mcp/tools/roll-dice';
import type { AgentMessage, AgentResponse, MCPContext } from '@/lib/mcp/types';
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

  // --- Route via Haiku coordinator ---
  const agentRole = await routeMessage(message);
  console.log(`[router] "${message.slice(0, 80)}" -> ${agentRole}`);

  // --- Build MCP context ---
  const mcpContext: MCPContext = {
    campaignId: session.campaign_id as string,
    gameSystem: campaign.game_system as string,
    userId: user.id,
  };

  // --- Dispatch to the correct agent ---
  try {
    let result: AgentResponse;

    switch (agentRole) {
      case 'narrator':
        result = await runNarratorAgent(message, mcpContext, conversationHistory);
        break;

      case 'rules_arbiter':
        result = await runRulesArbiterAgent(message, mcpContext, conversationHistory);
        break;

      case 'npc_dialogue':
        result = await runNpcDialogueAgent(message, mcpContext, conversationHistory);
        break;

      case 'lore_keeper':
        result = await runLoreKeeperAgent(message, mcpContext, conversationHistory);
        break;

      case 'encounter_builder':
        result = await runEncounterBuilderAgent(message, mcpContext, conversationHistory);
        break;

      default:
        return NextResponse.json({ error: `Unknown agent role: "${agentRole}"` }, { status: 400 });
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

      await supabase
        .from('sessions')
        .update({
          transcript: [
            ...currentTranscript,
            {
              role: 'player',
              content: message,
              timestamp: now,
            },
            {
              role: 'agent',
              agentType: result.agentRole,
              content: result.content,
              timestamp: now,
            },
          ],
        })
        .eq('id', sessionId);
    } catch (transcriptErr) {
      console.warn('[transcript] Failed to save transcript entry:', transcriptErr);
    }

    return NextResponse.json(result);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Internal server error';
    console.error('Agent request failed:', err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
