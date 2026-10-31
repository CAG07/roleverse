// lib/rag/index-map-pages.ts
// Finds and indexes the maps in an uploaded module PDF, after its text has
// been indexed by ingest-campaign-pdf.ts. Split into two calls so each fits
// in its own request: findMapPages (thumbnails of every page → which pages
// are maps) and indexMapPage (read one map page → one overview chunk per map
// plus one chunk per room, category 'map_layout').
//
// Room chunks carry structured metadata (mapLabel, roomKey, connectsTo) so the
// Game Master can look a room up exactly by level and number during play
// (lib/mcp/tools/map-rooms.ts) instead of relying on vector search, which
// can't tell "Room 19" from "Room 18".

import type { SupabaseClient } from '@supabase/supabase-js';
import { embedBatch } from './embed';
import { renderMapPage, renderPageThumbnails } from './pdf-pages';
import {
  classifyMapPages,
  formatMapOverviewMarkdown,
  formatMapRoomMarkdown,
  transcribeMapPage,
} from './map-vision';
import type { ChunkMetadata } from './types';

export interface MapPageContext {
  supabase: SupabaseClient;
  campaignId: string;
  userId: string;
  gameSystem: string;
  /** Storage object name — matched against metadata.title like every other chunk of this file. */
  fileName: string;
  fileBuffer: Buffer;
}

export interface IndexMapPageResult {
  pageNumber: number;
  mapsFound: number;
  roomsFound: number;
  truncated: boolean;
  /** False when the page couldn't be read at all (API or parse failure). */
  read: boolean;
}

/** Removes this file's map chunks — every page, or just one page. */
export async function deleteMapChunks(
  supabase: SupabaseClient,
  campaignId: string,
  fileName: string,
  pageNumber?: number
): Promise<void> {
  let query = supabase
    .from('campaign_embeddings')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('source_type', 'user_pdf')
    .eq('metadata->>title', fileName)
    .eq('metadata->>category', 'map_layout');
  if (pageNumber != null) query = query.eq('metadata->>pageNumber', String(pageNumber));

  const { error } = await query;
  if (error) throw new Error(`Failed to remove previous map data: ${error.message}`);
}

/** Clears this file's old map data and returns the page numbers that hold maps. */
export async function findMapPages(ctx: MapPageContext): Promise<number[]> {
  await deleteMapChunks(ctx.supabase, ctx.campaignId, ctx.fileName);
  const thumbnails = await renderPageThumbnails(ctx.fileBuffer);
  return classifyMapPages(thumbnails);
}

/** Reads one map page and replaces its map chunks. */
export async function indexMapPage(ctx: MapPageContext, pageNumber: number): Promise<IndexMapPageResult> {
  const images = await renderMapPage(ctx.fileBuffer, pageNumber);
  const reading = await transcribeMapPage(images);

  await deleteMapChunks(ctx.supabase, ctx.campaignId, ctx.fileName, pageNumber);

  if (!reading) {
    return { pageNumber, mapsFound: 0, roomsFound: 0, truncated: false, read: false };
  }

  const rows: { content: string; metadata: ChunkMetadata }[] = [];
  for (const map of reading.maps) {
    const base: ChunkMetadata = {
      gameSystem: ctx.gameSystem,
      source: 'user_pdf',
      category: 'map_layout',
      title: ctx.fileName,
      pageNumber,
      mapLabel: map.mapLabel,
    };
    rows.push({
      content: formatMapOverviewMarkdown(map),
      metadata: { ...base, mapOverview: true, roomKeys: map.rooms.map((r) => r.key) },
    });
    for (const room of map.rooms) {
      rows.push({
        content: formatMapRoomMarkdown(map, room),
        metadata: {
          ...base,
          roomKey: room.key,
          connectsTo: [...new Set(room.exits.filter((e) => !e.toLevel).map((e) => e.to))],
        },
      });
    }
  }

  if (rows.length > 0) {
    const embeddings = await embedBatch(rows.map((r) => r.content));
    const { error } = await ctx.supabase.from('campaign_embeddings').insert(
      rows.map((row, i) => ({
        campaign_id: ctx.campaignId,
        user_id: ctx.userId,
        game_system: ctx.gameSystem,
        content: row.content,
        embedding: embeddings[i],
        metadata: row.metadata,
        source_type: 'user_pdf' as const,
      }))
    );
    if (error) throw new Error(`Failed to save map data: ${error.message}`);
  }

  return {
    pageNumber,
    mapsFound: reading.maps.length,
    roomsFound: reading.maps.reduce((sum, m) => sum + m.rooms.length, 0),
    truncated: reading.truncated,
    read: true,
  };
}
