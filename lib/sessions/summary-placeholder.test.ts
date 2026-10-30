import { describe, expect, it } from 'vitest';

import { generateSessionSummary } from './generate-summary';
import { SUMMARY_PLACEHOLDER, isPlaceholderSummary } from './summary-placeholder';

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
});
