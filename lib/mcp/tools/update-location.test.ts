// lib/mcp/tools/update-location.test.ts
// The level guard: room numbers repeat between levels, so a room number alone
// stays on the party's current map, and moving to another map needs
// level_change. The Silver Princess bug this guards against: "Room 19" landed
// the party on the Upper Level while they were on the Entrance Level.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mapRooms = vi.hoisted(() => ({
  clearMapPosition: vi.fn(),
  findMapRoom: vi.fn(),
  getMapPosition: vi.fn(),
  listCampaignMaps: vi.fn(),
  saveMapPosition: vi.fn(),
}));
vi.mock('./map-rooms', () => mapRooms);
vi.mock('@/lib/rag/search-campaign-priority', () => ({ searchCampaignPriorityContent: vi.fn(async () => []) }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { executeUpdateLocation } from './update-location';

const context = { campaignId: 'camp-1', gameSystem: 'ADD2E', userId: 'user-1' };
const room = (mapLabel: string, roomKey: string, pageNumber: number) => ({
  mapLabel,
  roomKey,
  fileName: 'module.pdf',
  pageNumber,
  content: `## ${mapLabel} — Room ${roomKey}`,
  connectsTo: [],
  position: null,
});
const entrance19 = room('Entrance Level (EL)', '19', 35);
const upper19 = room('Upper Level (UL)', '19', 2);

beforeEach(() => {
  vi.clearAllMocks();
  mapRooms.listCampaignMaps.mockResolvedValue([]);
  mapRooms.getMapPosition.mockResolvedValue({
    mapLabel: 'Entrance Level (EL)',
    roomKey: '18',
    fileName: 'module.pdf',
    pageNumber: 35,
    updatedAt: '2026-11-01T00:00:00Z',
  });
});

describe('executeUpdateLocation level guard', () => {
  it('reads a room number alone as a room on the current map', async () => {
    mapRooms.findMapRoom.mockResolvedValue({ room: entrance19, neighbors: [] });
    const result = await executeUpdateLocation({ location_label: 'room 19', room_key: '19' }, context);
    expect(mapRooms.findMapRoom).toHaveBeenCalledWith('camp-1', 'Entrance Level (EL)', '19', []);
    expect(mapRooms.saveMapPosition).toHaveBeenCalledWith('camp-1', entrance19);
    expect(result.mapRoom?.mapLabel).toBe('Entrance Level (EL)');
  });

  it('refuses to move to another level without level_change', async () => {
    mapRooms.findMapRoom.mockResolvedValue({ room: upper19, neighbors: [] });
    const result = await executeUpdateLocation(
      { location_label: 'room 19', map_label: 'Upper Level (UL)', room_key: '19' },
      context
    );
    expect(mapRooms.saveMapPosition).not.toHaveBeenCalled();
    expect(result.mapRoom).toBeUndefined();
    expect(result.note).toContain('level_change: true');
  });

  it('moves to another level with level_change', async () => {
    mapRooms.findMapRoom.mockResolvedValue({ room: upper19, neighbors: [] });
    const result = await executeUpdateLocation(
      { location_label: 'top of the stairs', map_label: 'Upper Level (UL)', room_key: '19', level_change: true },
      context
    );
    expect(mapRooms.saveMapPosition).toHaveBeenCalledWith('camp-1', upper19);
    expect(result.mapRoom?.mapLabel).toBe('Upper Level (UL)');
  });

  it('asks for a map when the party has no position yet', async () => {
    mapRooms.getMapPosition.mockResolvedValue(null);
    const result = await executeUpdateLocation({ location_label: 'room 19', room_key: '19' }, context);
    expect(mapRooms.findMapRoom).not.toHaveBeenCalled();
    expect(result.note).toContain('needs a map_label');
  });
});
