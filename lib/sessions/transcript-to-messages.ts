// lib/sessions/transcript-to-messages.ts
// Hydrates a stored session transcript into the ChatWindow's in-memory
// message list. Extracted from components/session/ChatWindow.tsx as a pure
// function so the "an existing session's transcript actually loads on mount"
// invariant can be unit tested without mounting the component — see
// transcript-to-messages.test.ts.
import type { AgentType, ChatMessage, TranscriptEntry } from '@/lib/types/session';

export function transcriptToMessages(entries: TranscriptEntry[]): ChatMessage[] {
  return entries.map((entry, i) => {
    const parsedTimestamp = entry.timestamp ? new Date(entry.timestamp) : null;
    const timestamp =
      parsedTimestamp && !Number.isNaN(parsedTimestamp.getTime()) ? parsedTimestamp : new Date();
    if (entry.role === 'player') {
      return {
        id: `hist-${i}`,
        role: 'player' as const,
        playerName: 'You',
        content: entry.content ?? '',
        source: 'typed' as const,
        timestamp,
      };
    }
    if (entry.role === 'oracle') {
      return {
        id: `hist-${i}`,
        role: 'oracle' as const,
        content: entry.content ?? '',
        timestamp,
      };
    }
    return {
      id: `hist-${i}`,
      role: 'agent' as const,
      agentType:
        entry.agentType === 'game_master' ||
        entry.agentType === 'rules_arbiter' ||
        entry.agentType === 'lore_keeper'
          ? (entry.agentType as AgentType)
          : undefined,
      content: entry.content ?? '',
      timestamp,
    };
  });
}
