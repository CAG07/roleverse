// lib/sessions/transcript-to-messages.test.ts
// Guards the "empty chat on navigation" regression class: an existing
// session's stored transcript must actually hydrate into a non-empty,
// order-preserving message list.
import { describe, expect, it } from 'vitest';
import type { TranscriptEntry } from '@/lib/types/session';
import { transcriptToMessages } from './transcript-to-messages';

describe('transcriptToMessages', () => {
  it('hydrates a non-empty transcript into a non-empty, order-preserving message list', () => {
    const entries: TranscriptEntry[] = [
      { role: 'player', content: 'I open the door.', timestamp: '2026-01-01T00:00:00Z' },
      {
        role: 'agent',
        agentType: 'game_master',
        content: 'It creaks open.',
        timestamp: '2026-01-01T00:00:01Z',
      },
    ];

    const messages = transcriptToMessages(entries);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: 'player', content: 'I open the door.' });
    expect(messages[1]).toMatchObject({
      role: 'agent',
      agentType: 'game_master',
      content: 'It creaks open.',
    });
  });

  it('returns an empty list for an empty transcript, and falls back to now() for a missing/invalid timestamp', () => {
    expect(transcriptToMessages([])).toEqual([]);

    const [message] = transcriptToMessages([{ role: 'player', content: 'hi' }]);
    expect(message.timestamp).toBeInstanceOf(Date);
    expect(Number.isNaN(message.timestamp.getTime())).toBe(false);
  });
});
