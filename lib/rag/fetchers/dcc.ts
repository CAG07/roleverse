// lib/rag/fetchers/dcc.ts
// Fetches DCC (Dungeon Crawl Classics) baseline content from the local stub file.
// Reads data/dcc-stub.md and yields a single RagChunk so that the game_system
// row exists in the embeddings index even before a proper DCC source is available.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { RagChunk } from '../types';

/** Progress callback invoked after each chunk is yielded */
export type ProgressCallback = (fetched: number, total: number) => void;

/**
 * Yield chunks from data/dcc-stub.md.
 * The stub is a single markdown file; it is returned as one chunk (ingest.ts will
 * split it further if needed).
 */
export async function* fetchDccChunks(
  onProgress?: ProgressCallback
): AsyncGenerator<RagChunk> {
  const stubPath = join(process.cwd(), 'data', 'dcc-stub.md');

  let content: string;
  try {
    content = await readFile(stubPath, 'utf-8');
  } catch (err) {
    throw new Error(
      `DCC stub not found at ${stubPath}. ` +
        `Ensure data/dcc-stub.md exists in the repository root. Original error: ${String(err)}`
    );
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new Error('data/dcc-stub.md is empty — nothing to ingest.');
  }

  onProgress?.(0, 1);

  yield {
    content: trimmed,
    metadata: {
      gameSystem: 'DCC',
      source: 'dcc-stub',
      category: 'rule',
      title: 'Dungeon Crawl Classics — Baseline Stub',
      sourceUrl: 'data/dcc-stub.md',
    },
  };

  onProgress?.(1, 1);
}
