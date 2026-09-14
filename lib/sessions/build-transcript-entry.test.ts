// lib/sessions/build-transcript-entry.test.ts
import { describe, expect, it } from 'vitest';
import { buildTranscriptEntries } from './build-transcript-entry';

const KNOWN_LABEL_PREFIX = /^\[(Game Master|Rules Arbiter|Lore Keeper)\]/;

describe('buildTranscriptEntries', () => {
  it('agent entry content never starts with a bracketed agent-label prefix', () => {
    const [, agentEntry] = buildTranscriptEntries(
      'I open the door.',
      'game_master',
      'It creaks open, revealing a dim corridor.',
      '2026-01-01T00:00:00Z'
    );
    expect(agentEntry.content).not.toMatch(KNOWN_LABEL_PREFIX);
    expect(agentEntry.agentType).toBe('game_master');
  });

  it('preserves player message and timestamp on the player entry', () => {
    const [playerEntry] = buildTranscriptEntries(
      'I search the room.',
      'rules_arbiter',
      'A DC 15 Perception check.',
      '2026-01-02T00:00:00Z'
    );
    expect(playerEntry).toEqual({
      role: 'player',
      content: 'I search the room.',
      timestamp: '2026-01-02T00:00:00Z',
    });
  });
});
