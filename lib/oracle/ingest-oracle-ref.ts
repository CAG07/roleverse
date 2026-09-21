// lib/oracle/ingest-oracle-ref.ts
// Indexes a player-uploaded oracle/solo-play system reference (PDF, plain
// text, or Markdown) into campaign_embeddings under source_type =
// 'oracle_ref', retrieved via match_campaign_priority_embeddings the same
// way module PDFs are (see lib/rag/search-campaign-priority.ts) — just a
// different source_type, so oracle content never competes against or mixes
// with module/house-rules content in retrieval.
//
// Deliberately a slimmed-down sibling of lib/rag/ingest-campaign-pdf.ts, not
// a shared function: an oracle rulebook has no dungeon maps and no
// scene-image/YouTube references, so the map-vision detection and
// scene/youtube-ref tagging that file does are simply not applicable here.

import type { SupabaseClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse-fork';
import { chunkText } from '@/lib/rag/chunk';
import { embedBatch } from '@/lib/rag/embed';
import type { ChunkMetadata } from '@/lib/rag/types';

const UPSERT_BATCH_SIZE = 50;

export interface IngestOracleRefOptions {
  supabase: SupabaseClient;
  campaignId: string;
  userId: string;
  gameSystem: string;
  /** Display filename — stored in metadata.title so the UI can show per-file indexed status. */
  fileName: string;
  fileBuffer: Buffer;
}

export interface IngestOracleRefResult {
  chunksIndexed: number;
  pages: number;
}

function isPlainTextFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.txt') || lower.endsWith('.md');
}

export async function ingestOracleRef(options: IngestOracleRefOptions): Promise<IngestOracleRefResult> {
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
  await deleteIndexedOracleRefChunks(supabase, campaignId, fileName);

  const chunks = chunkText(text);
  let chunksIndexed = 0;

  for (let i = 0; i < chunks.length; i += UPSERT_BATCH_SIZE) {
    const batch = chunks.slice(i, i + UPSERT_BATCH_SIZE);
    const embeddings = await embedBatch(batch);

    const rows = batch.map((content, j) => {
      const metadata: ChunkMetadata = {
        gameSystem,
        source: 'oracle_ref',
        category: 'oracle',
        title: fileName,
      };

      return {
        campaign_id: campaignId,
        user_id: userId,
        game_system: gameSystem,
        content,
        embedding: embeddings[j],
        metadata,
        source_type: 'oracle_ref' as const,
      };
    });

    const { error } = await supabase.from('campaign_embeddings').insert(rows);
    if (error) throw new Error(`Failed to index chunk batch: ${error.message}`);

    chunksIndexed += rows.length;
  }

  return { chunksIndexed, pages };
}

/** Remove previously indexed chunks for a given oracle reference file (used before re-indexing and on delete). */
export async function deleteIndexedOracleRefChunks(
  supabase: SupabaseClient,
  campaignId: string,
  fileName: string
): Promise<void> {
  const { error } = await supabase
    .from('campaign_embeddings')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('source_type', 'oracle_ref')
    .eq('metadata->>title', fileName);

  if (error) {
    throw new Error(`Failed to delete previously indexed oracle reference chunks: ${error.message}`);
  }
}
