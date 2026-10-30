// lib/sessions/previous-summary.ts
// Shared lookup for "where the last session left off", used by the Game
// Master (continuity injection). The summary itself is written to explicitly
// close with where the party left off (see lib/sessions/generate-summary.ts),
// so normally the newest summary alone is enough to resume smoothly.
//
// Two cases need more than "the newest summary":
// - Sessions that ended with the placeholder summary (opened and closed with
//   no real play) are skipped, so the last real recap is found instead of
//   being hidden behind "no significant events".
// - A session that ended with NO summary (generation failed, or is still
//   running right after Stop Session) must not be skipped: falling back to the
//   older summary alone would resume from an out-of-date position. Its final
//   exchanges are added after the older summary instead.

import { createClient } from '@/lib/supabase/server';
import { isPlaceholderSummary } from './summary-placeholder';
import { tailExcerpt, type TranscriptEntryLike } from './transcript-excerpt';

/** How many recent ended sessions to look through for a real summary. */
const LOOKBACK_SESSIONS = 5;

/** Budget for the final exchanges of a session that has no summary. */
const UNSUMMARIZED_TAIL_CHARS = 6_000;

export async function fetchPreviousEndedSessionSummary(campaignId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, summary')
      .eq('campaign_id', campaignId)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(LOOKBACK_SESSIONS);

    let unsummarizedTail: string | null = null;

    for (const session of sessions ?? []) {
      const summary = (session.summary as string | null | undefined) ?? null;
      if (isPlaceholderSummary(summary)) continue;

      if (summary) {
        if (!unsummarizedTail) return summary;
        return [
          summary,
          '',
          'The most recent session has no saved summary. Its final exchanges below show',
          'where the party actually left off, and take precedence over the summary above:',
          '',
          unsummarizedTail,
        ].join('\n');
      }

      // Newest session without a summary: keep its tail and look one further
      // back for the recap that leads up to it.
      if (!unsummarizedTail) {
        const { data: row } = await supabase
          .from('sessions')
          .select('transcript')
          .eq('id', session.id)
          .maybeSingle();
        const entries = Array.isArray(row?.transcript) ? (row.transcript as TranscriptEntryLike[]) : [];
        const tail = tailExcerpt(entries, UNSUMMARIZED_TAIL_CHARS);
        if (tail) unsummarizedTail = tail;
      }
    }

    return unsummarizedTail
      ? `The most recent session has no saved summary. Its final exchanges show where the party left off:\n\n${unsummarizedTail}`
      : null;
  } catch (err) {
    console.error('[previous-summary] Failed to fetch previous session summary:', err);
    return null;
  }
}
