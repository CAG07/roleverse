import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { formatKnownMaps, formatPosition, matchMapLabel, normalizeRoomKey } from './map-rooms';

const LABELS = ['Upper Level (UL)', 'Guard Tower Level (TL)', 'Entrance Level (EL)'];

describe('normalizeRoomKey', () => {
  it('strips "Room", trailing punctuation, and case', () => {
    expect(normalizeRoomKey('Room 19')).toBe('19');
    expect(normalizeRoomKey(' 19. ')).toBe('19');
    expect(normalizeRoomKey('2?')).toBe('2');
    expect(normalizeRoomKey('A')).toBe('a');
  });
});

describe('matchMapLabel', () => {
  it('matches the exact label regardless of case and punctuation', () => {
    expect(matchMapLabel('entrance level (el)', LABELS)).toBe('Entrance Level (EL)');
  });

  it('matches the printed abbreviation', () => {
    expect(matchMapLabel('TL', LABELS)).toBe('Guard Tower Level (TL)');
  });

  it('matches a shortened label when only one map fits', () => {
    expect(matchMapLabel('Upper Level', LABELS)).toBe('Upper Level (UL)');
  });

  it('refuses an ambiguous or unknown label instead of guessing', () => {
    expect(matchMapLabel('Level', LABELS)).toBeNull();
    expect(matchMapLabel('Dungeon Level 3', LABELS)).toBeNull();
  });
});

describe('prompt formatting', () => {
  it('lists each map with its rooms', () => {
    expect(
      formatKnownMaps([{ mapLabel: 'Entrance Level (EL)', roomKeys: ['1', '2', '19'], fileName: 'f.pdf', pageNumber: 35 }])
    ).toBe('- Entrance Level (EL): rooms 1, 2, 19');
  });

  it('describes the current room and its neighbours', () => {
    const room = {
      mapLabel: 'Entrance Level (EL)',
      roomKey: '19',
      fileName: 'f.pdf',
      pageNumber: 35,
      content: '## Entrance Level (EL) — Room 19',
      connectsTo: ['20'],
    };
    const neighbor = { ...room, roomKey: '20', content: '## Entrance Level (EL) — Room 20' };
    expect(formatPosition(room, [neighbor])).toBe(
      'The party is in Room 19 on Entrance Level (EL).\n\n## Entrance Level (EL) — Room 19\n\n' +
        'Connected rooms on the same map:\n\n## Entrance Level (EL) — Room 20'
    );
  });
});
