// lib/sessions/build-session-export.ts
// Builds a single human-readable Markdown document for one session — summary
// plus the full turn-by-turn transcript. Markdown (not plain .txt) so
// headers/emphasis survive if the file is opened in Kanka, Obsidian, GitHub,
// or any other Markdown-aware journal tool, consistent with the CSV export's
// "generically useful, not just Kanka-specific" framing.

import type { TranscriptEntry } from '@/lib/types/session';

const AGENT_LABELS: Record<string, string> = {
  game_master: 'Game Master',
  rules_arbiter: 'Rules Arbiter',
  lore_keeper: 'Lore Keeper',
  // Legacy aliases — old transcripts may carry these agentType values
  narrator: 'Narrator',
  npc_dialogue: 'NPC Dialogue',
  encounter_builder: 'Encounter Builder',
};

function entrySpeaker(entry: TranscriptEntry): string {
  if (entry.role === 'player') return 'Player';
  if (entry.role === 'oracle') return 'Oracle';
  if (entry.role === 'agent') return AGENT_LABELS[entry.agentType ?? 'game_master'] ?? 'Game Master';
  return 'System';
}

export interface SessionExportInput {
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  transcript: TranscriptEntry[] | null;
}

export function buildSessionMarkdown(session: SessionExportInput): string {
  const startDate = new Date(session.started_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = new Date(session.started_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const lines: string[] = [];
  lines.push(`# Session — ${startDate}`);
  lines.push('');
  lines.push(`*Started ${startTime}${session.ended_at ? ', completed' : ' (active)'}*`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(session.summary ?? '_No AI summary was generated for this session._');
  lines.push('');
  lines.push('## Transcript');
  lines.push('');

  const entries = session.transcript ?? [];
  if (entries.length === 0) {
    lines.push('_No messages were recorded in this session._');
  } else {
    for (const entry of entries) {
      if (!entry.content) continue;
      lines.push(`**${entrySpeaker(entry)}:** ${entry.content}`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('_exported from RoleVerse_');

  return lines.join('\n');
}
