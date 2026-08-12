// lib/rag/ingest-campaign-pdf.ts
// Indexes a single player-uploaded file (PDF, plain text, or Markdown) into
// campaign_embeddings so the Rules Arbiter can retrieve it via
// match_campaign_priority_embeddings (guaranteed, non-competing against
// baseline SRD) and, on the general baseline+campaign pool, via
// match_rules_embeddings too. The Lore Keeper does not do RAG search at all —
// it reads campaigns.notes + session transcripts directly — so this content
// is Rules-Arbiter- and Game-Master-only.
//
// Unlike lib/rag/ingest.ts (baseline system rules — service-role client,
// generation-swap, campaign_id IS NULL), this writes campaign-scoped rows
// (source_type = 'user_pdf') through the request-scoped, RLS-protected
// Supabase client. RLS already allows this: the "Users can create embeddings"
// policy permits inserting rows where campaign_id IS NOT NULL AND
// auth.uid() = user_id (see 20260301000000_rag_phase_6a.sql) — no service-role
// client needed. match_rules_embeddings already unions baseline rows
// (campaign_id IS NULL) with a campaign's own rows in one query, and the
// Rules Arbiter already passes campaignId on every search, so nothing on the
// retrieval side needs to change.

import type { SupabaseClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse-fork';
import { chunkText } from './chunk';
import { embedBatch } from './embed';
import { extractYoutubeVideoId } from '@/lib/scenes/youtube';
import { listCampaignSceneFilenames, extractImageRef } from '@/lib/scenes/image-ref';
import { detectMapCandidatePages } from './pdf-pages';
import {
  classifyAndTranscribeMapPage,
  formatMapRoomMarkdown,
  formatMapOverviewMarkdown,
} from './map-vision';
import type { ChunkMetadata } from './types';

const UPSERT_BATCH_SIZE = 50;
/** How many candidate map pages get vision-classified concurrently. */
const MAP_VISION_CONCURRENCY = 4;

export interface IngestCampaignPdfOptions {
  supabase: SupabaseClient;
  campaignId: string;
  userId: string;
  gameSystem: string;
  /** Display filename — stored in metadata.title so the UI can show per-file indexed status. */
  fileName: string;
  fileBuffer: Buffer;
}

export interface IngestCampaignPdfResult {
  chunksIndexed: number;
  pages: number;
  mapPagesFound: number;
}

/** Plain text and Markdown need no parsing — only .pdf goes through pdfParse. */
function isPlainTextFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.txt') || lower.endsWith('.md');
}

export async function ingestCampaignPdf(
  options: IngestCampaignPdfOptions
): Promise<IngestCampaignPdfResult> {
  const { supabase, campaignId, userId, gameSystem, fileName, fileBuffer } = options;
  const isPdf = !isPlainTextFile(fileName);

  let text: string;
  let pages = 1;
  if (isPdf) {
    const parsed = await pdfParse(fileBuffer);
    text = parsed.text.trim();
    pages = parsed.numpages;
  } else {
    text = fileBuffer.toString('utf-8').trim();
  }
  if (!text) {
    throw new Error(
      'No extractable text found in this file (a PDF may be a scanned image without OCR).'
    );
  }

  // Replace any prior chunks from this same file before writing new ones, so
  // re-indexing after an edit doesn't leave stale duplicate content behind.
  await deleteIndexedPdfChunks(supabase, campaignId, fileName);

  // A player can reference their own already-uploaded Scene Library image by
  // filename inside this document's text — fetched once, checked per chunk
  // below, same idea as the youtubeVideoId detection.
  const sceneFilenames = await listCampaignSceneFilenames(supabase, userId, campaignId);

  const chunks = chunkText(text);
  let chunksIndexed = 0;

  for (let i = 0; i < chunks.length; i += UPSERT_BATCH_SIZE) {
    const batch = chunks.slice(i, i + UPSERT_BATCH_SIZE);
    const embeddings = await embedBatch(batch);

    const rows = batch.map((content, j) => {
      // A player can write a YouTube link directly into their own uploaded
      // document (e.g. "when the party reaches the chapel: youtu.be/xyz") —
      // tag whichever chunk contains it so the Game Master can auto-attach it
      // as scene media when narration matches that same chunk. Same idea for
      // a Scene Library image referenced by filename.
      const youtubeVideoId = extractYoutubeVideoId(content);
      const imageRef = extractImageRef(content, sceneFilenames);
      const metadata: ChunkMetadata = {
        gameSystem,
        source: 'user_pdf',
        category: 'module',
        title: fileName,
        ...(youtubeVideoId ? { youtubeVideoId } : {}),
        ...(imageRef ? { imageRef } : {}),
      };

      return {
        campaign_id: campaignId,
        user_id: userId,
        game_system: gameSystem,
        content,
        embedding: embeddings[j],
        metadata,
        source_type: 'user_pdf' as const,
      };
    });

    const { error } = await supabase.from('campaign_embeddings').insert(rows);
    if (error) throw new Error(`Failed to index chunk batch: ${error.message}`);

    chunksIndexed += rows.length;
  }

  // Old TSR-module dungeon layouts are frequently encoded only as a hand-drawn
  // map image, never as prose — text extraction above can't recover that. For
  // PDFs only, find likely map pages and have Claude vision transcribe them
  // once at upload time into structured, retrievable ground truth (see
  // lib/rag/pdf-pages.ts and lib/rag/map-vision.ts). Best-effort: a failure
  // here never invalidates the prose indexing that already succeeded above.
  let mapPagesFound = 0;
  if (isPdf) {
    try {
      mapPagesFound = await indexMapPages(supabase, fileBuffer, {
        campaignId,
        userId,
        gameSystem,
        fileName,
      });
    } catch (err) {
      console.warn('[ingest] Map page detection/transcription failed:', err);
    }
  }

  return { chunksIndexed, pages, mapPagesFound };
}

async function indexMapPages(
  supabase: SupabaseClient,
  fileBuffer: Buffer,
  ctx: { campaignId: string; userId: string; gameSystem: string; fileName: string }
): Promise<number> {
  const candidates = await detectMapCandidatePages(fileBuffer);
  let mapPagesFound = 0;

  for (let i = 0; i < candidates.length; i += MAP_VISION_CONCURRENCY) {
    const batch = candidates.slice(i, i + MAP_VISION_CONCURRENCY);
    const transcriptions = await Promise.all(
      batch.map((c) => classifyAndTranscribeMapPage(c.pngBase64, c.pageNumber))
    );

    for (const t of transcriptions) {
      if (!t) continue;
      mapPagesFound++;

      // One overview chunk (label, room index, legend) plus one chunk per
      // room — each room chunk carries its parent map's label/page in its
      // own text and metadata, so retrieval on a room number that recurs on
      // another level (e.g. two maps that both have a "Room 19") can't be
      // confused with the wrong level's chunk.
      const contents = [
        formatMapOverviewMarkdown(t),
        ...t.rooms.map((room) => formatMapRoomMarkdown(t, room)),
      ];
      let embeddings: number[][];
      try {
        embeddings = await embedBatch(contents);
      } catch (err) {
        console.warn(`[ingest] Failed to embed map page ${t.pageNumber}:`, err);
        continue;
      }

      const rows = contents.map((content, j) => {
        const room = j === 0 ? null : t.rooms[j - 1];
        const metadata: ChunkMetadata = {
          gameSystem: ctx.gameSystem,
          source: 'user_pdf',
          category: 'map_layout',
          title: ctx.fileName,
          pageNumber: t.pageNumber,
          mapLabel: t.mapLabel,
          ...(room ? { roomKey: room.key } : {}),
        };
        return {
          campaign_id: ctx.campaignId,
          user_id: ctx.userId,
          game_system: ctx.gameSystem,
          content,
          embedding: embeddings[j],
          metadata,
          source_type: 'user_pdf' as const,
        };
      });

      const { error } = await supabase.from('campaign_embeddings').insert(rows);
      if (error) {
        console.warn(`[ingest] Failed to index map page ${t.pageNumber}:`, error.message);
      }
    }
  }

  return mapPagesFound;
}

/** Remove previously indexed chunks for a given source file (used before re-indexing and on delete). */
export async function deleteIndexedPdfChunks(
  supabase: SupabaseClient,
  campaignId: string,
  fileName: string
): Promise<void> {
  const { error } = await supabase
    .from('campaign_embeddings')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('source_type', 'user_pdf')
    .eq('metadata->>title', fileName);

  if (error) {
    throw new Error(`Failed to delete previously indexed PDF chunks: ${error.message}`);
  }
}
