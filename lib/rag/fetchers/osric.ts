// lib/rag/fetchers/osric.ts
// Fetches OSRIC baseline content from the local stub file. OSRIC is a retro-clone
// of BOTH AD&D 1st and 2nd Edition rules, so the same file is ingested twice — once
// per game_system tag — rather than being split into two separate source files. See
// the "Where 1E and 2E Diverge" section of data/osric-stub.md for the handful of
// mechanics that differ between editions.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { RagChunk } from '../types';

/** Progress callback invoked after each chunk is yielded */
export type ProgressCallback = (fetched: number, total: number) => void;

/**
 * Yield chunks from data/osric-stub.md, tagged for the given edition.
 * The stub is a single markdown file; it is returned as one chunk (ingest.ts will
 * split it further if needed).
 */
export async function* fetchOsricChunks(
  gameSystem: 'ADD1E' | 'ADD2E',
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

  const editionLabel = gameSystem === 'ADD1E' ? '1E' : '2E';
  yield {
    content: trimmed,
    metadata: {
      gameSystem,
      source: 'osric',
      category: 'rule',
      title: `OSRIC / AD&D ${editionLabel} — Baseline Reference`,
      sourceUrl: 'data/osric-stub.md',
    },
  };

  onProgress?.(1, 1);
}
