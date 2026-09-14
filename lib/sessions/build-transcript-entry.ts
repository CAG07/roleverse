// lib/sessions/build-transcript-entry.ts
// Builds the pair of transcript entries persisted after each chat turn in
// app/api/sessions/[sessionId]/message/route.ts. Extracted as a pure function
// so the "agent entries never carry a [Agent Name] prefix in content — the
// label lives only in agentType" invariant can be unit tested directly (see
// build-transcript-entry.test.ts) rather than only via source inspection.
import type { AgentType } from '@/lib/types/session';

export interface BuiltTranscriptEntry {
  role: 'player' | 'agent';
  agentType?: AgentType;
  content: string;
  timestamp: string;
}

export function buildTranscriptEntries(
  playerMessage: string,
  agentRole: AgentType,
  agentContent: string,
  timestamp: string
): [BuiltTranscriptEntry, BuiltTranscriptEntry] {
  return [
    { role: 'player', content: playerMessage, timestamp },
    { role: 'agent', agentType: agentRole, content: agentContent, timestamp },
  ];
}
