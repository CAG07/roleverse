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
 *
 * The separator cost ("\n\n" = 2 chars per join) is included in the budget
 * check so the returned string never exceeds maxChars.
 */
export function tailExcerpt(entries: TranscriptEntryLike[], maxChars: number): string {
  const lines: string[] = [];
  let charCount = 0;

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (!entry?.content) continue;

    const prefix =
      entry.role === 'player' ? 'Player:' : entry.role === 'oracle' ? 'Oracle:' : `${entry.agentType ?? 'Agent'}:`;
    const line = `${prefix} ${entry.content}`;
    // Account for the "\n\n" separator that join() will add between lines.
    const separatorCost = lines.length > 0 ? 2 : 0;
    if (charCount + separatorCost + line.length > maxChars) break;

    lines.push(line);
    charCount += separatorCost + line.length;
  }

  // Lines were collected newest-first; reverse to restore chronological order.
  lines.reverse();
  return lines.join('\n\n');
}
