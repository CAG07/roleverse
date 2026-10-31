// lib/sessions/play-time.ts
// Time actually spent playing a session, rather than how long it stayed open.
// A session stays open until the player presses Stop Session, so one session
// is often resumed across several days; ended_at - started_at then counts every
// day in between. Instead, add up the gaps between consecutive messages and
// leave out any gap longer than IDLE_GAP_MS (the player stepped away).
//
// Computed once when the session ends and saved as sessions.play_time_seconds
// (see the end route), so pages showing play time don't load full transcripts.
// The migration that added the column backfills past sessions with the same rule.

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

/** Play time to save in sessions.play_time_seconds when a session ends. */
export function computePlayTimeSeconds(startedAt: string, transcript: unknown): number {
  const entries = Array.isArray(transcript) ? (transcript as { timestamp?: string }[]) : [];
  return Math.floor(computePlayTimeMs(startedAt, entries.map((e) => e?.timestamp)) / 1000);
}

export function formatPlayTime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return 'Less than a minute played';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${mins}m played` : `${mins}m played`;
}

/** Play time label for a session row; "Active" while the session is still open. */
export function sessionPlayTimeLabel(endedAt: string | null, playTimeSeconds: number | null): string {
  if (!endedAt) return 'Active';
  if (playTimeSeconds == null) return 'Play time not recorded';
  return formatPlayTime(playTimeSeconds * 1000);
}
