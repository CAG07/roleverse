// app/api/agent/route.ts
// POST /api/agent — run an AI agent request with auth + campaign membership check

import { NextRequest, NextResponse } from 'next/server';

import { runNarratorAgent } from '@/lib/mcp/agents/narrator';
import { registerRollDiceTool } from '@/lib/mcp/tools/roll-dice';
import type { AgentRequest, AgentResponse, MCPContext } from '@/lib/mcp/types';
import { createClient } from '@/lib/supabase/server';

// Register MCP tools on module load (runs once per cold start)
registerRollDiceTool();

export async function POST(request: NextRequest) {
  // --- Auth ---
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- Parse body ---
  let body: AgentRequest;
  try {
    body = (await request.json()) as AgentRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { agentRole, message, context, conversationHistory } = body;

  if (!agentRole || !message || !context?.campaignId || !context?.gameSystem) {
    return NextResponse.json(
      {
        error:
          'Missing required fields: agentRole, message, context.campaignId, context.gameSystem',
      },
      { status: 400 }
    );
  }

  // --- Campaign membership check (RLS enforces row-level access) ---
  const { data: membership, error: memberError } = await supabase
    .from('campaign_members')
    .select('id')
    .eq('campaign_id', context.campaignId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (memberError) {
    return NextResponse.json({ error: 'Failed to verify campaign membership' }, { status: 500 });
  }

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this campaign' }, { status: 403 });
  }

  // --- Build MCP context ---
  const mcpContext: MCPContext = {
    campaignId: context.campaignId,
    gameSystem: context.gameSystem,
    userId: user.id,
    characterId: context.characterId,
  };

  // --- Dispatch to the correct agent ---
  try {
    let result: AgentResponse;

    switch (agentRole) {
      case 'narrator':
        result = await runNarratorAgent(message, mcpContext, conversationHistory);
        break;

      // Future agent roles will be added here
      case 'rules_arbiter':
      case 'npc_dialogue':
      case 'lore_keeper':
      case 'encounter_builder':
        return NextResponse.json(
          { error: `Agent role "${agentRole}" is not yet implemented` },
          { status: 501 }
        );

      default:
        return NextResponse.json({ error: `Unknown agent role: "${agentRole}"` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Agent request failed:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
