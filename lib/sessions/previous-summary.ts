// lib/sessions/previous-summary.ts
// Shared lookup for "the most recent ended session's summary" — used by the
// Game Master (continuity injection) and the new-session page (proactive
// recap). The summary itself is written to explicitly close with where the
// party left off (see lib/sessions/generate-summary.ts), so this alone is
// enough context to resume smoothly without needing raw transcript text.

import { createClient } from '@/lib/supabase/server';

export async function fetchPreviousEndedSessionSummary(campaignId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('sessions')
      .select('summary')
      .eq('campaign_id', campaignId)
      .not('ended_at', 'is', null)
      .not('summary', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.summary as string | null | undefined) ?? null;
  } catch {
    return null;
  }
}
