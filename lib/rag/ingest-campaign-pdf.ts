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
import { getDocumentProxy, extractText } from 'unpdf';
import { chunkText } from './chunk';
import { embedBatch } from './embed';
import { extractYoutubeVideoId } from '@/lib/scenes/youtube';
import { listCampaignSceneFilenames, extractImageRef } from '@/lib/scenes/image-ref';
import type { ChunkMetadata } from './types';

const UPSERT_BATCH_SIZE = 50;

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
}

/** Plain text and Markdown need no parsing — only .pdf goes through per-page extraction. */
function isPlainTextFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.txt') || lower.endsWith('.md');
}

export async function ingestCampaignPdf(
  options: IngestCampaignPdfOptions
): Promise<IngestCampaignPdfResult> {
  const { supabase, campaignId, userId, gameSystem, fileName, fileBuffer } = options;
  const isPdf = !isPlainTextFile(fileName);

  // Extracted per-page (not as one flattened string) so each resulting chunk can
  // carry a real page number in its metadata. Plain .txt/.md has no page concept,
  // so it's treated as a single "page" with no page number attached to its chunks.
  // Map pages are found and read separately afterwards (lib/rag/index-map-pages.ts),
  // one request per page, so map reading never shares this request's time limit.
  let pageTexts: string[];
  let pages: number;
  if (isPdf) {
    const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
    const { text: perPage } = await extractText(pdf, { mergePages: false });
    pageTexts = perPage.map((t) => t.trim());
    pages = pageTexts.length;
  } else {
    pageTexts = [fileBuffer.toString('utf-8').trim()];
    pages = 1;
  }
  const text = pageTexts.join('\n\n').trim();
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

  // Chunked per page rather than on the flattened document, so a chunk never
  // spans a page boundary — the trade-off is that content that used to be
  // joined into one chunk right at a boundary now splits into two (each still
  // gets its own overlapChars overlap, just not across pages). That's an
  // acceptable cost: a chunk spanning two pages couldn't be given one accurate
  // page number anyway, and precise page attribution is the whole point here.
  const pageChunks: { content: string; pageNumber?: number }[] = pageTexts.flatMap(
    (pageText, i) =>
      chunkText(pageText).map((content) => ({
        content,
        ...(isPdf ? { pageNumber: i + 1 } : {}),
      }))
  );
  let chunksIndexed = 0;

  for (let i = 0; i < pageChunks.length; i += UPSERT_BATCH_SIZE) {
    const batch = pageChunks.slice(i, i + UPSERT_BATCH_SIZE);
    const embeddings = await embedBatch(batch.map((c) => c.content));

    const rows = batch.map((chunk, j) => {
      // A player can write a YouTube link directly into their own uploaded
      // document (e.g. "when the party reaches the chapel: youtu.be/xyz") —
      // tag whichever chunk contains it so the Game Master can auto-attach it
      // as scene media when narration matches that same chunk. Same idea for
      // a Scene Library image referenced by filename.
      const youtubeVideoId = extractYoutubeVideoId(chunk.content);
      const imageRef = extractImageRef(chunk.content, sceneFilenames);
      const metadata: ChunkMetadata = {
        gameSystem,
        source: 'user_pdf',
        category: 'module',
        title: fileName,
        ...(chunk.pageNumber != null ? { pageNumber: chunk.pageNumber } : {}),
        ...(youtubeVideoId ? { youtubeVideoId } : {}),
        ...(imageRef ? { imageRef } : {}),
      };

      return {
        campaign_id: campaignId,
        user_id: userId,
        game_system: gameSystem,
        content: chunk.content,
        embedding: embeddings[j],
        metadata,
        source_type: 'user_pdf' as const,
      };
    });

    const { error } = await supabase.from('campaign_embeddings').insert(rows);
    if (error) throw new Error(`Failed to index chunk batch: ${error.message}`);

    chunksIndexed += rows.length;
  }

  return { chunksIndexed, pages };
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
