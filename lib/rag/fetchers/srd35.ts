// lib/rag/fetchers/srd35.ts
// Fetches D&D 3.5 spells from olimot/srd-v3.5-md — the SRD 3.5 as markdown,
// Open Game Content under the OGL 1.0a (each file opens with that notice).
//
// Scope: the spell descriptions and the class spell lists only. Rules text comes
// from rulebooks players upload to their own campaigns, so the shared baseline
// index holds just this lookup data. Pinned to one commit so a re-run always
// ingests the same text. Each file is split on `##` headings: one spell per chunk.

import type { RagChunk } from '../types';
import { fetchWithRetry } from './utils';

const REPO = 'olimot/srd-v3.5-md';
const COMMIT = 'c7f30a0ce11a579f75456746f278a4c75f67b4c1';
/** spells/*.md except magic-overview.md, which is rules text. */
const SPELL_FILE = /^spells\/(spells-|spell-list-).+\.md$/;

export const OGL_ATTRIBUTION =
  'Open Game Content from the System Reference Document 3.5, Copyright 2000-2003, Wizards of the ' +
  'Coast, Inc. Used under the Open Game License v1.0a.';

/** Progress callback invoked after each file is processed */
export type ProgressCallback = (fetched: number, total: number | null) => void;

interface MarkdownSection {
  heading: string;
  body: string;
}

/** Split markdown on `## ` headings, dropping the preamble (the OGL notice and chapter title). */
function splitSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  let heading: string | null = null;
  let lines: string[] = [];
  const flush = () => {
    const body = lines.join('\n').trim();
    if (heading && body) sections.push({ heading, body });
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

export async function* fetchSrd35Chunks(onProgress?: ProgressCallback): AsyncGenerator<RagChunk> {
  const token = process.env.GITHUB_TOKEN;
  const treeRes = await fetchWithRetry(`https://api.github.com/repos/${REPO}/git/trees/${COMMIT}?recursive=1`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!treeRes.ok) {
    throw new Error(`SRD 3.5 file listing failed: ${treeRes.status} ${treeRes.statusText}`);
  }
  const tree = (await treeRes.json()) as { tree: { path: string; type: string }[] };
  const files = tree.tree
    .filter((e) => e.type === 'blob' && e.path.endsWith('.md'))
    .map((e) => e.path)
    .filter((p) => SPELL_FILE.test(p));

  let done = 0;
  for (const path of files) {
    const url = `https://raw.githubusercontent.com/${REPO}/${COMMIT}/${path}`;
    const res = await fetchWithRetry(url);
    if (!res.ok) throw new Error(`SRD 3.5 fetch failed for ${path}: ${res.status} ${res.statusText}`);
    const markdown = await res.text();

    // The file's own "# TITLE" line names the chapter (e.g. "SPELLS (A-B)").
    const chapter = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? path;
    const category = path.includes('spell-list') ? 'spell_list' : 'spell';

    for (const section of splitSections(markdown)) {
      // Some headings carry inline HTML, e.g. "Cleric Spells <small>...</small>".
      const title = section.heading.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      yield {
        content: `## ${title}\n\n${section.body}`,
        metadata: {
          gameSystem: '3_5E',
          source: 'srd35',
          category,
          title,
          chapter,
          sourceUrl: `https://github.com/${REPO}/blob/${COMMIT}/${path}`,
          attribution: OGL_ATTRIBUTION,
        },
      };
    }

    done++;
    onProgress?.(done, files.length);
  }
}
