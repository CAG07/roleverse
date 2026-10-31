// lib/rag/map-images.ts
// Saved images of module map pages, so the Game Master can look at the map
// itself during play instead of relying only on the text the scan read from it.
//
// index-map-pages.ts saves each map page's high-resolution render when the
// page is read. During play, map-rooms.ts asks for a view around the party's
// room: a zoomed crop centred on where the scan saw that room (its position),
// or the whole page when the position isn't known. Corridors, junctions and
// door symbols then come straight from the picture.
//
// Images live under the player's own storage folder but outside the campaign
// folder (<user>/map-images/<campaign>/<file>/page-<n>.png), so they don't
// count toward the campaign's upload limit or show in Modules & Files.

import type { SupabaseClient } from '@supabase/supabase-js';
import { createCanvas, loadImage, type Image } from '@napi-rs/canvas';
import { MODULE_BUCKET } from '@/lib/campaigns/module-file-access';

/** Share of the page's long edge that a room view covers, centred on the room.
 * Wide enough to show the rooms and corridors around it and to absorb an
 * approximate room position. */
const ROOM_VIEW_SHARE = 0.4;

/** Long edge of a room view sent to the Game Master — about 2,600 visual tokens. */
const ROOM_VIEW_LONG_EDGE = 1400;

/** Long edge of a whole-page view, used when the room's position isn't known. */
const PAGE_VIEW_LONG_EDGE = 2000;

const JPEG_QUALITY = 88;

export interface MapPoint {
  /** 0 = left edge, 1 = right edge of the page. */
  x: number;
  /** 0 = top edge, 1 = bottom edge of the page. */
  y: number;
}

export interface MapView {
  base64: string;
  mediaType: 'image/jpeg';
}

function mapImageFolder(userId: string, campaignId: string, fileName: string): string {
  return `${userId}/map-images/${campaignId}/${fileName}`;
}

export function mapImagePath(userId: string, campaignId: string, fileName: string, pageNumber: number): string {
  return `${mapImageFolder(userId, campaignId, fileName)}/page-${pageNumber}.png`;
}

/**
 * Saves (replaces) one map page's image, the PNG it was rendered as: for
 * printed map line art PNG is smaller than JPEG (about 0.9 MB against 1.6 MB
 * for a full Silver Princess level) and loses no detail.
 */
export async function saveMapPageImage(
  supabase: SupabaseClient,
  path: string,
  png: Buffer
): Promise<void> {
  // Remove first: the bucket has no update policy, so an upsert can't overwrite.
  await supabase.storage.from(MODULE_BUCKET).remove([path]);
  const { error } = await supabase.storage
    .from(MODULE_BUCKET)
    .upload(path, png, { contentType: 'image/png' });
  if (error) throw new Error(`Failed to save the map image: ${error.message}`);
}

/** Removes a file's saved map images, all of them or all but keepPages. */
export async function deleteMapImages(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string,
  fileName: string,
  keepPages: number[] = []
): Promise<void> {
  const folder = mapImageFolder(userId, campaignId, fileName);
  const { data } = await supabase.storage.from(MODULE_BUCKET).list(folder);
  const keep = new Set(keepPages.map((page) => `page-${page}.png`));
  const paths = (data ?? [])
    .filter((f) => f.id !== null && !keep.has(f.name))
    .map((f) => `${folder}/${f.name}`);
  if (paths.length > 0) await supabase.storage.from(MODULE_BUCKET).remove(paths);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The crop rectangle for a room view, kept inside the image. */
export function roomViewRect(
  width: number,
  height: number,
  point: MapPoint
): { x: number; y: number; width: number; height: number } {
  const side = Math.round(Math.max(width, height) * ROOM_VIEW_SHARE);
  const cropWidth = Math.min(side, width);
  const cropHeight = Math.min(side, height);
  const centreX = clamp(point.x, 0, 1) * width;
  const centreY = clamp(point.y, 0, 1) * height;
  return {
    x: Math.round(clamp(centreX - cropWidth / 2, 0, width - cropWidth)),
    y: Math.round(clamp(centreY - cropHeight / 2, 0, height - cropHeight)),
    width: cropWidth,
    height: cropHeight,
  };
}

async function toJpegView(
  image: Image,
  rect: { x: number; y: number; width: number; height: number },
  longEdge: number
): Promise<MapView> {
  const scale = Math.min(1, longEdge / Math.max(rect.width, rect.height));
  const canvas = createCanvas(Math.round(rect.width * scale), Math.round(rect.height * scale));
  canvas
    .getContext('2d')
    .drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
  const jpeg = await canvas.encode('jpeg', JPEG_QUALITY);
  return { base64: jpeg.toString('base64'), mediaType: 'image/jpeg' };
}

/**
 * A view of a saved map page: a zoomed crop around point, or the whole page
 * when point is null. Null when the page has no saved image (scanned before
 * images were saved) or it can't be loaded.
 */
export async function loadMapView(
  supabase: SupabaseClient,
  path: string,
  point: MapPoint | null
): Promise<MapView | null> {
  try {
    const { data, error } = await supabase.storage.from(MODULE_BUCKET).download(path);
    if (error || !data) return null;
    const image = await loadImage(Buffer.from(await data.arrayBuffer()));
    return point
      ? await toJpegView(image, roomViewRect(image.width, image.height, point), ROOM_VIEW_LONG_EDGE)
      : await toJpegView(image, { x: 0, y: 0, width: image.width, height: image.height }, PAGE_VIEW_LONG_EDGE);
  } catch (err) {
    console.warn('[map-images] Failed to load a map view:', err);
    return null;
  }
}
