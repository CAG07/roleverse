// lib/rag/ingest.ts
// Ingestion orchestrator — coordinates fetching, chunking, embedding, and upserting.
// Runs server-side (Node.js) with a Supabase service-role client so it can write
// baseline rows (campaign_id IS NULL, user_id IS NULL) that bypass RLS.
//
// Zero-downtime re-ingestion via generation swap:
// New chunks are written under generation N+1 while generation N stays live.
// The old generation is deleted only after the new one is fully written.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { chunkText } from './chunk';
import { embedBatch } from './embed';
import type { RagChunk } from './types';

/** How many chunks to embed and upsert in a single batch */
const UPSERT_BATCH_SIZE = 50;

/** Supported game systems for baseline ingestion */
export type IngestableSystem = '5E_2014' | 'PATHFINDER_2E' | 'ADD1E' | 'ADD2E' | 'DCC';

export interface IngestOptions {
  /** Game system to ingest */
  gameSystem: IngestableSystem;
  /** UUID of the ingestion_jobs row to update with progress */
  jobId: string;
  /** Abort signal for graceful cancellation */
  signal?: AbortSignal;
}

export interface IngestResult {
  chunksProcessed: number;
  chunksUpserted: number;
  generation: number;
}

/**
 * Run the full ingestion pipeline for a given game system.
 *
 * Steps:
 * 1. Determine the next generation number for this system.
 * 2. Fetch raw content from the appropriate fetcher.
 * 3. Split long entries into overlapping text chunks.
 * 4. Embed each chunk via Voyage AI and upsert under the new generation.
 * 5. After all chunks are written, delete the previous generation atomically.
 * 6. Update ingestion_jobs progress throughout.
 *
 * The previous generation remains fully queryable until step 5 completes,
 * so active game sessions are never interrupted during re-ingestion.
 */
export async function ingestSystem(options: IngestOptions): Promise<IngestResult> {
  const { gameSystem, jobId, signal } = options;

  const supabase = getServiceClient();

  // Mark job as running
  await supabase
    .from('ingestion_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', jobId);

  try {
    // Determine the next generation number.
    // Existing live data stays queryable under the current generation
    // throughout the entire ingestion run.
    const { data: genRow } = await supabase
      .from('campaign_embeddings')
      .select('generation')
      .eq('game_system', gameSystem)
      .eq('source_type', 'baseline')
      .is('campaign_id', null)
      .order('generation', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newGeneration = ((genRow?.generation as number | null) ?? 0) + 1;
    console.log(`[${gameSystem}] Starting generation ${newGeneration} (previous: ${newGeneration - 1})`);

    const chunkStream = streamChunksForSystem(gameSystem);
    const buffer: RagChunk[] = [];
    let chunksProcessed = 0;
    let chunksUpserted = 0;

    for await (const rawChunk of chunkStream) {
      if (signal?.aborted) {
        throw new Error('Ingestion cancelled');
      }

      // Split the raw content into sub-chunks if it's too long
      const subTexts = chunkText(rawChunk.content);
      for (const text of subTexts) {
        buffer.push({ content: text, metadata: rawChunk.metadata });
        chunksProcessed++;
      }

      // Flush when we have enough to batch
      if (buffer.length >= UPSERT_BATCH_SIZE) {
        const upserted = await flushBuffer(buffer, supabase, gameSystem, newGeneration);
        chunksUpserted += upserted;
        buffer.length = 0;

        // Update progress
        await supabase
          .from('ingestion_jobs')
          .update({ processed_chunks: chunksUpserted })
          .eq('id', jobId);
      }
    }

    // Flush remainder
    if (buffer.length > 0) {
      const upserted = await flushBuffer(buffer, supabase, gameSystem, newGeneration);
      chunksUpserted += upserted;
    }

    console.log(
      `[${gameSystem}] All ${chunksUpserted} chunks written under generation ${newGeneration}` +
      ` — retiring previous generations...`
    );

    // All new chunks are written — now atomically retire all previous generations.
    // This is the only moment old data is removed. New data is already complete
    // and queryable, so active sessions see no gap.
    const { error: deleteError, count: deletedCount } = await supabase
      .from('campaign_embeddings')
      .delete({ count: 'exact' })
      .eq('game_system', gameSystem)
      .eq('source_type', 'baseline')
      .is('campaign_id', null)
      .lt('generation', newGeneration);

    if (deleteError) {
      // Non-fatal: old generation rows are orphaned but don't break anything.
      // Log clearly so it shows up in Actions output for debugging.
      console.warn(
        `[${gameSystem}] Warning: failed to delete old generation rows: ${deleteError.message}`
      );
    } else {
      console.log(
        `[${gameSystem}] Retired old generations — deleted ${deletedCount ?? 0} rows` +
        ` (generations < ${newGeneration})`
      );
    }

    // Mark completed
    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'completed',
        total_chunks: chunksProcessed,
        processed_chunks: chunksUpserted,
        completed_at: new Date().toISOString(),
        metadata: { generation: newGeneration },
      })
      .eq('id', jobId);

    return { chunksProcessed, chunksUpserted, generation: newGeneration };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'failed',
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    throw err;
  }
}

/** Embed a buffer of chunks and insert them tagged with the current generation */
async function flushBuffer(
  chunks: RagChunk[],
  supabase: SupabaseClient,
  gameSystem: string,
  generation: number
): Promise<number> {
  const texts = chunks.map((c) => c.content);
  const embeddings = await embedBatch(texts);

  const rows = chunks.map((chunk, i) => ({
    campaign_id: null,
    user_id: null,
    game_system: gameSystem,
    content: chunk.content,
    embedding: embeddings[i],
    metadata: chunk.metadata,
    source_type: 'baseline' as const,
    generation,
  }));

  const { error } = await supabase.from('campaign_embeddings').insert(rows);

  if (error) {
    throw new Error(`Failed to upsert embeddings: ${error.message}`);
  }

  return rows.length;
}

/** Return an async generator of raw chunks for the given game system */
async function* streamChunksForSystem(gameSystem: IngestableSystem): AsyncGenerator<RagChunk> {
  switch (gameSystem) {
    case '5E_2014': {
      const { fetchOpen5eChunks } = await import('./fetchers/open5e');
      yield* fetchOpen5eChunks();
      break;
    }
    case 'PATHFINDER_2E': {
      const { fetchPf2eChunks } = await import('./fetchers/pf2e');
      yield* fetchPf2eChunks();
      break;
    }
    case 'ADD1E': {
      const { fetchOsricChunks } = await import('./fetchers/osric');
      yield* fetchOsricChunks('ADD1E');
      break;
    }
    case 'ADD2E': {
      const { fetchOsricChunks } = await import('./fetchers/osric');
      yield* fetchOsricChunks('ADD2E');
      break;
    }
    case 'DCC': {
      const { fetchDccChunks } = await import('./fetchers/dcc');
      yield* fetchDccChunks();
      break;
    }
    default: {
      const _unreachable: never = gameSystem;
      throw new Error(`No fetcher configured for game system: ${String(_unreachable)}`);
    }
  }
}

/** Create a Supabase client using the service role key (bypasses RLS) */
function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for ingestion'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}