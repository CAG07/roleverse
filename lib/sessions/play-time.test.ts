import { describe, expect, it } from 'vitest';

import { computePlayTimeMs, computePlayTimeSeconds, formatPlayTime, sessionPlayTimeLabel } from './play-time';

const MIN = 60_000;

describe('computePlayTimeMs', () => {
  it('adds up gaps between messages within one sitting', () => {
    expect(
      computePlayTimeMs('2026-07-27T03:00:00Z', ['2026-07-27T03:05:00Z', '2026-07-27T03:20:00Z'])
    ).toBe(20 * MIN);
  });

  it('leaves out days the session sat open between sittings', () => {
    const ms = computePlayTimeMs('2026-07-27T03:00:00Z', [
      '2026-07-27T03:10:00Z',
      '2026-07-27T03:25:00Z',
      // three days later
      '2026-07-30T18:00:00Z',
      '2026-07-30T18:12:00Z',
    ]);
    expect(ms).toBe(37 * MIN);
  });

  it('ignores missing or invalid timestamps and unsorted input', () => {
    expect(
      computePlayTimeMs('2026-07-27T03:00:00Z', [undefined, 'not a date', '2026-07-27T03:04:00Z', null])
    ).toBe(4 * MIN);
  });

  it('is zero for a session opened and closed without play', () => {
    expect(computePlayTimeMs('2026-10-27T05:26:00Z', [])).toBe(0);
  });
});

describe('formatPlayTime and sessionPlayTimeLabel', () => {
  it('formats hours and minutes', () => {
    expect(formatPlayTime(0)).toBe('Less than a minute played');
    expect(formatPlayTime(45 * MIN)).toBe('45m played');
    expect(formatPlayTime(135 * MIN)).toBe('2h 15m played');
  });

  it('says Active while the session is open', () => {
    expect(sessionPlayTimeLabel(null, null)).toBe('Active');
  });

  it('formats the saved play time, and says when none was recorded', () => {
    expect(sessionPlayTimeLabel('2026-10-30T04:14:00Z', 60)).toBe('1m played');
    expect(sessionPlayTimeLabel('2026-10-30T04:14:00Z', null)).toBe('Play time not recorded');
  });
});

describe('computePlayTimeSeconds', () => {
  it('reads timestamps from transcript entries', () => {
    expect(
      computePlayTimeSeconds('2026-10-27T05:26:00Z', [
        { role: 'player', timestamp: '2026-10-27T05:26:30Z' },
        { role: 'agent', timestamp: '2026-10-27T05:27:00Z' },
      ])
    ).toBe(60);
  });

  it('is zero for a transcript that is not a list', () => {
    expect(computePlayTimeSeconds('2026-10-27T05:26:00Z', null)).toBe(0);
  });
});
