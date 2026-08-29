// lib/oracle/log-oracle-result.ts
// Fire-and-forget client helper: appends an Oracle-panel result to the
// session transcript via /api/sessions/[sessionId]/oracle-log, so every tool
// in OraclePanel.tsx (Quick Oracle, Scale Check, generators) leaves a real
// record that shows up in the session log and interleaves with Journal
// entries — the same way "My Oracle" consultations already persist
// themselves server-side.

export function logOracleResult(sessionId: string, content: string): void {
  void fetch(`/api/sessions/${sessionId}/oracle-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  }).catch(() => {
    // Best-effort — a failed log write shouldn't block or disrupt play.
  });
}
