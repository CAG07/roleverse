import { describe, expect, it } from 'vitest';
import {
  formatMapOverviewMarkdown,
  formatMapRoomMarkdown,
  parseMapPageClassification,
  parseMapTranscription,
} from './map-vision';

describe('parseMapPageClassification', () => {
  it('returns only pages marked as maps, ignoring code fences', () => {
    const text = '```json\n[{"page":1,"is_map":false},{"page":2,"is_map":true},{"page":35,"is_map":true}]\n```';
    expect(parseMapPageClassification(text)).toEqual([2, 35]);
  });

  it('returns an empty list for a non-array reply', () => {
    expect(parseMapPageClassification('{"page":2}')).toEqual([]);
  });
});

describe('parseMapTranscription', () => {
  const twoMaps = JSON.stringify({
    maps: [
      {
        map_label: 'Upper Level (UL)',
        rooms: [
          { key: 1, notes: 'Small room', exits: [{ to: '2', via: 'door', direction: 'east', to_level: null }] },
          { key: '2', notes: '', exits: [] },
        ],
        level_connections: [],
        other_visible_text: ['Scale: One square = 10 feet'],
      },
      {
        map_label: 'Guard Tower Level (TL)',
        rooms: [{ key: '1', notes: 'Tower room', exits: [{ to: 'Entrance Level', via: 'stairs down', to_level: 'Entrance Level (EL)' }] }],
      },
    ],
  });

  it('keeps each map on a page separate, so repeated room numbers are not merged', () => {
    const maps = parseMapTranscription(twoMaps, 2);
    expect(maps.map((m) => m.mapLabel)).toEqual(['Upper Level (UL)', 'Guard Tower Level (TL)']);
    expect(maps[0].rooms.map((r) => r.key)).toEqual(['1', '2']);
    expect(maps[1].rooms[0].exits[0]).toEqual({
      to: 'Entrance Level',
      via: 'stairs down',
      direction: null,
      toLevel: 'Entrance Level (EL)',
    });
    expect(maps.every((m) => m.pageNumber === 2)).toBe(true);
  });

  it('drops maps without rooms and names an untitled map', () => {
    const maps = parseMapTranscription(
      JSON.stringify({ maps: [{ map_label: 'Legend', rooms: [] }, { rooms: [{ key: 'A', exits: [] }] }] }),
      7
    );
    expect(maps).toHaveLength(1);
    expect(maps[0].mapLabel).toBe('Untitled map 2 (page 7)');
  });

  it("keeps each room's position on the page, dropping one outside the page or not a number", () => {
    const text = JSON.stringify({
      maps: [
        {
          map_label: 'Entrance Level (EL)',
          rooms: [
            { key: '19', position: { x: 0.62, y: 0.47 }, exits: [] },
            { key: '20', position: { x: 1.4, y: 0.5 }, exits: [] },
            { key: '21', exits: [] },
            { key: '22', position: { x: null, y: null }, exits: [] },
            { key: '23', position: { x: '', y: false }, exits: [] },
            { key: '24', position: { x: '0.5', y: '0.5' }, exits: [] },
          ],
        },
      ],
    });
    expect(parseMapTranscription(text, 35)[0].rooms.map((r) => r.position)).toEqual([
      { x: 0.62, y: 0.47 },
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('throws on a cut-off reply so the caller can report it', () => {
    expect(() => parseMapTranscription('{"maps":[{"map_label":"Entrance Level","rooms":[{"key":"1"', 35)).toThrow();
  });
});

describe('map chunk formatting', () => {
  const [map] = parseMapTranscription(
    JSON.stringify({
      maps: [
        {
          map_label: 'Entrance Level (EL)',
          rooms: [
            {
              key: '19',
              notes: 'Corridor intersection.',
              exits: [
                { to: '20', via: 'door', direction: 'south', to_level: null },
                { to: 'corridor', via: 'open', direction: 'west', to_level: null },
              ],
            },
          ],
          level_connections: ['UL marker beside room 33 leads to the Upper Level'],
        },
      ],
    }),
    35
  );

  it('labels each room chunk with its map and lists exits', () => {
    expect(formatMapRoomMarkdown(map, map.rooms[0])).toBe(
      '## Entrance Level (EL) — Room 19\n\nCorridor intersection.\nExits: south, door to room 20; west, open to corridor'
    );
  });

  it('lists rooms and links to other maps in the overview', () => {
    const overview = formatMapOverviewMarkdown(map);
    expect(overview).toContain('Rooms on this map: 19');
    expect(overview).toContain('- UL marker beside room 33 leads to the Upper Level');
  });
});
