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

/** Plain text and Markdown need no parsing — only .pdf goes through pdfParse. */
function isPlainTextFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.txt') || lower.endsWith('.md');
}

export async function ingestCampaignPdf(
  options: IngestCampaignPdfOptions
): Promise<IngestCampaignPdfResult> {
  const { supabase, campaignId, userId, gameSystem, fileName, fileBuffer } = options;

  let text: string;
  let pages = 1;
  if (isPlainTextFile(fileName)) {
    text = fileBuffer.toString('utf-8').trim();
  } else {
    const parsed = await pdfParse(fileBuffer);
    text = parsed.text.trim();
    pages = parsed.numpages;
  }
  if (!text) {
    throw new Error(
      'No extractable text found in this file (a PDF may be a scanned image without OCR).'
    );
  }

  // Replace any prior chunks from this same file before writing new ones, so
  // re-indexing after an edit doesn't leave stale duplicate content behind.
  await deleteIndexedPdfChunks(supabase, campaignId, fileName);

  const chunks = chunkText(text);
  let chunksIndexed = 0;

  for (let i = 0; i < chunks.length; i += UPSERT_BATCH_SIZE) {
    const batch = chunks.slice(i, i + UPSERT_BATCH_SIZE);
    const embeddings = await embedBatch(batch);

    const rows = batch.map((content, j) => {
      // A player can write a YouTube link directly into their own uploaded
      // document (e.g. "when the party reaches the chapel: youtu.be/xyz") —
      // tag whichever chunk contains it so the Game Master can auto-attach it
      // as scene media when narration matches that same chunk.
      const youtubeVideoId = extractYoutubeVideoId(content);
      const metadata: ChunkMetadata = {
        gameSystem,
        source: 'user_pdf',
        category: 'module',
        title: fileName,
        ...(youtubeVideoId ? { youtubeVideoId } : {}),
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
