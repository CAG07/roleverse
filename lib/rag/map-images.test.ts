// lib/rag/map-images.test.ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { mapImagePath, roomViewRect } from './map-images';

describe('roomViewRect', () => {
  it('centres a 40% square on the room', () => {
    expect(roomViewRect(3500, 4400, { x: 0.5, y: 0.5 })).toEqual({ x: 870, y: 1320, width: 1760, height: 1760 });
  });

  it('stays inside the page for a room near a corner', () => {
    expect(roomViewRect(3500, 4400, { x: 0.98, y: 0.02 })).toEqual({ x: 1740, y: 0, width: 1760, height: 1760 });
  });
});

describe('mapImagePath', () => {
  it('sits in the player folder, outside the campaign upload folder', () => {
    expect(mapImagePath('user-1', 'camp-1', '123-module.pdf', 35)).toBe(
      'user-1/map-images/camp-1/123-module.pdf/page-35.png'
    );
  });
});
