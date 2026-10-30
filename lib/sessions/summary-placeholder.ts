// lib/sessions/summary-placeholder.ts
// The stand-in summary saved when a session ends with too little play to recap
// (see generate-summary.ts). It's shown in the session log, but it is NOT a real
// recap: anything that resumes play from "the last session" must skip it, or a
// session that was opened and closed without playing hides the real summary of
// the session before it.

export const SUMMARY_PLACEHOLDER = 'This session contained no significant events.';

export function isPlaceholderSummary(summary: string | null | undefined): boolean {
  return summary?.trim() === SUMMARY_PLACEHOLDER;
}
