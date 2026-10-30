// lib/sessions/play-time.ts
// Time actually spent playing a session, rather than how long it stayed open.
// A session stays open until the player presses Stop Session, so one session
// is often resumed across several days; ended_at - started_at then counts every
// day in between. Instead, add up the gaps between consecutive messages and
// leave out any gap longer than IDLE_GAP_MS (the player stepped away).

const IDLE_GAP_MS = 30 * 60 * 1000;

export function computePlayTimeMs(startedAt: string, timestamps: (string | null | undefined)[]): number {
  const points = [startedAt, ...timestamps]
    .filter((t): t is string => typeof t === 'string' && t.length > 0)
    .map((t) => new Date(t).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const gap = points[i] - points[i - 1];
    if (gap <= IDLE_GAP_MS) total += gap;
  }
  return total;
}

export function formatPlayTime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return 'Less than a minute played';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${mins}m played` : `${mins}m played`;
}

/** Play time label for a session row; "Active" while the session is still open. */
export function sessionPlayTimeLabel(
  startedAt: string,
  endedAt: string | null,
  transcript: unknown
): string {
  if (!endedAt) return 'Active';
  const entries = Array.isArray(transcript) ? (transcript as { timestamp?: string }[]) : [];
  return formatPlayTime(computePlayTimeMs(startedAt, entries.map((e) => e?.timestamp)));
}
