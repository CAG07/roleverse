// lib/sessions/transcript-excerpt.test.ts
import { describe, expect, it } from 'vitest';

import { tailExcerpt } from './transcript-excerpt';

describe('tailExcerpt', () => {
  it('keeps the newest entries that fit, in chronological order', () => {
    const entries = [
      { role: 'player', content: 'first' },
      { role: 'agent', agentType: 'Game Master', content: 'second' },
      { role: 'player', content: 'third' },
    ];
    expect(tailExcerpt(entries, 40)).toBe('Game Master: second\n\nPlayer: third');
  });

  it('keeps the end of a newest entry that is over budget on its own', () => {
    const long = 'a'.repeat(100) + 'THE END';
    const excerpt = tailExcerpt([{ role: 'player', content: long }], 30);
    expect(excerpt.length).toBeLessThanOrEqual(30);
    expect(excerpt.startsWith('Player: …')).toBe(true);
    expect(excerpt.endsWith('THE END')).toBe(true);
  });

  it('returns an empty string when the budget is too small for any text', () => {
    expect(tailExcerpt([{ role: 'player', content: 'hello' }], 5)).toBe('');
  });
});
