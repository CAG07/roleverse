// lib/sessions/summary-placeholder.ts
// The stand-in summary saved when a session ends with too little play to recap
// (see generate-summary.ts). It's shown in the session log, but it is NOT a real
// recap: anything that resumes play from "the last session" must skip it, or a
// session that was opened and closed without playing hides the real summary of
// the session before it.

export const SUMMARY_PLACEHOLDER = 'This session contained no significant events.';

/**
 * PostgREST `.or()` filter that leaves placeholder sessions out of a query, so
 * a row limit counts only real sessions. Sessions with no summary at all are
 * kept (null never equals the placeholder, so `neq` alone would drop them).
 */
export const EXCLUDE_PLACEHOLDER_SUMMARY_FILTER = `summary.is.null,summary.neq."${SUMMARY_PLACEHOLDER}"`;

export function isPlaceholderSummary(summary: string | null | undefined): boolean {
  return summary?.trim() === SUMMARY_PLACEHOLDER;
}
