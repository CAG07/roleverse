import { describe, expect, it } from 'vitest';

import { generateSessionSummary } from './generate-summary';
import {
  EXCLUDE_PLACEHOLDER_SUMMARY_FILTER,
  SUMMARY_PLACEHOLDER,
  isPlaceholderSummary,
} from './summary-placeholder';

describe('summary placeholder', () => {
  it('is what a session with only the opening message gets', async () => {
    const summary = await generateSessionSummary(
      [
        { role: 'player', content: "I'm ready to begin." },
        { role: 'agent', agentType: 'game_master', content: 'Welcome back.' },
      ],
      'AD&D 1st Edition'
    );
    expect(summary).toBe(SUMMARY_PLACEHOLDER);
    expect(isPlaceholderSummary(summary)).toBe(true);
  });

  it('does not match a real recap or a missing summary', () => {
    expect(isPlaceholderSummary('The party fought six ubues.\n\nWhere We Left Off: Room 19.')).toBe(false);
    expect(isPlaceholderSummary(null)).toBe(false);
    expect(isPlaceholderSummary(undefined)).toBe(false);
  });

  it('filters placeholders in the query while keeping sessions with no summary', () => {
    // Quoted, because the placeholder's period and spaces are reserved in PostgREST filters.
    expect(EXCLUDE_PLACEHOLDER_SUMMARY_FILTER).toBe(
      'summary.is.null,summary.neq."This session contained no significant events."'
    );
  });
});
