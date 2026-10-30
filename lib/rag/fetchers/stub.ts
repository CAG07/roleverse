// lib/rag/fetchers/stub.ts
// Fetcher for the hand-written reference documents in data/*.md: the small rules
// fallback for systems with no open, machine-readable rules source. Players'
// uploaded rulebooks take priority over these in retrieval (they get a guaranteed
// slot via match_campaign_priority_embeddings); these cover campaigns that have
// nothing uploaded yet.
//
// Each `## ` section becomes its own chunk titled by its heading, so a question
// about one mechanic retrieves that section rather than an arbitrary slice of the
// whole file. ingest.ts's chunker still splits any section longer than its limit.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { RagChunk } from '../types';

export interface StubSource {
  /** File name under data/, e.g. 'dnd4e-stub.md' */
  file: string;
  /** Game system id the chunks are tagged with */
  gameSystem: string;
  /** Source label stored in metadata, e.g. 'dnd4e-stub' */
  source: string;
  /** Document title, prefixed to every section title */
  title: string;
  /** Optional attribution/license line stored in metadata */
  attribution?: string;
}

export interface MarkdownSection {
  heading: string | null;
  body: string;
}

/**
 * Split markdown on level-2 headings. Text before the first `## ` is returned
 * with heading null. Horizontal rules (`---`) between sections are dropped.
 */
export function splitMarkdownSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  let heading: string | null = null;
  let lines: string[] = [];

  const flush = () => {
    const body = lines
      .join('\n')
      .replace(/^\s*---\s*$/gm, '')
      .trim();
    if (body.length > 0) sections.push({ heading, body });
  };

  for (const lineText of markdown.split(/\r?\n/)) {
    const match = /^##\s+(.+?)\s*$/.exec(lineText);
    if (match) {
      flush();
      heading = match[1];
      lines = [];
    } else {
      lines.push(lineText);
    }
  }
  flush();
  return sections;
}

export async function* fetchStubChunks(stub: StubSource): AsyncGenerator<RagChunk> {
  const path = join(process.cwd(), 'data', stub.file);
  let markdown: string;
  try {
    markdown = await readFile(path, 'utf-8');
  } catch (err) {
    throw new Error(`Reference document not found at ${path}. Original error: ${String(err)}`);
  }

  const sections = splitMarkdownSections(markdown);
  if (sections.length === 0) {
    throw new Error(`data/${stub.file} is empty — nothing to ingest.`);
  }

  for (const section of sections) {
    yield {
      content: section.heading ? `## ${section.heading}\n\n${section.body}` : section.body,
      metadata: {
        gameSystem: stub.gameSystem,
        source: stub.source,
        category: 'rule',
        title: section.heading ? `${stub.title}: ${section.heading}` : stub.title,
        sourceUrl: `data/${stub.file}`,
        ...(stub.attribution ? { attribution: stub.attribution } : {}),
      },
    };
  }
}
