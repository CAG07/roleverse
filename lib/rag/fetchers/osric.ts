// lib/rag/fetchers/osric.ts
// Fetches OSRIC / AD&D 2E baseline content from the local stub file.
// Reads data/osric-stub.md and yields a single RagChunk so that the game_system
// row exists in the embeddings index even before a proper OSRIC source is available.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { RagChunk } from '../types';

/** Progress callback invoked after each chunk is yielded */
export type ProgressCallback = (fetched: number, total: number) => void;

/**
 * Yield chunks from data/osric-stub.md.
 * The stub is a single markdown file; it is returned as one chunk (ingest.ts will
 * split it further if needed).
 */
export async function* fetchOsricChunks(
  onProgress?: ProgressCallback
): AsyncGenerator<RagChunk> {
  const stubPath = join(process.cwd(), 'data', 'osric-stub.md');

  let content: string;
  try {
    content = await readFile(stubPath, 'utf-8');
  } catch (err) {
    throw new Error(
      `OSRIC stub not found at ${stubPath}. ` +
        `Ensure data/osric-stub.md exists in the repository root. Original error: ${String(err)}`
    );
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new Error('data/osric-stub.md is empty — nothing to ingest.');
  }

  onProgress?.(0, 1);

  yield {
    content: trimmed,
    metadata: {
      gameSystem: 'ADD2E',
      source: 'osric',
      category: 'rule',
      title: 'OSRIC / AD&D 2E — Baseline Stub',
      sourceUrl: 'data/osric-stub.md',
    },
  };

  onProgress?.(1, 1);
}
