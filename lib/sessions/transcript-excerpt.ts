// lib/sessions/transcript-excerpt.ts
// Shared helper for pulling the most recent portion of a transcript — the part
// that answers "where did we leave off," as opposed to the beginning.

export interface TranscriptEntryLike {
  role?: string;
  content?: string;
  agentType?: string;
}

/**
 * Format the tail of a transcript (most recent entries first, bounded by
 * maxChars), returned in chronological order. Walks entries from the end
 * backward so long transcripts lose their *oldest* content to the budget,
 * not their most recent — the mirror image of a naive head-first accumulator.
 */
export function tailExcerpt(entries: TranscriptEntryLike[], maxChars: number): string {
  const lines: string[] = [];
  let charCount = 0;

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (!entry?.content) continue;

    const prefix = entry.role === 'player' ? 'Player:' : `${entry.agentType ?? 'Agent'}:`;
    const line = `${prefix} ${entry.content}`;
    if (charCount + line.length > maxChars) break;

    lines.unshift(line);
    charCount += line.length;
  }

  return lines.join('\n\n');
}
