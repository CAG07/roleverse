// lib/rag/fetchers/srd35.ts
// Fetches D&D 3.5 content from olimot/srd-v3.5-md — the SRD 3.5 as markdown,
// Open Game Content under the OGL 1.0a (each file opens with that notice).
//
// Scope: spell descriptions, class spell lists, and a small rules fallback (the
// two combat chapters and the special abilities and conditions chapter). Full
// rules text comes from rulebooks players upload to their own campaigns, which
// take priority. Pinned to one commit so a re-run always ingests the same text.
// Spell files split on `##` (one spell per chunk); rules files also split on
// `###`, since their `##` sections run to several pages.

import type { RagChunk } from '../types';
import { fetchWithRetry } from './utils';

const REPO = 'olimot/srd-v3.5-md';
const COMMIT = 'c7f30a0ce11a579f75456746f278a4c75f67b4c1';
/** spells/*.md except magic-overview.md. */
const SPELL_FILE = /^spells\/(spells-|spell-list-).+\.md$/;
/** The rules fallback: combat and conditions. */
const RULES_FILES = new Set([
  'basic-rules-and-legal/combat-i-basics.md',
  'basic-rules-and-legal/combat-ii-movement-modifiers-and-special-actions.md',
  'basic-rules-and-legal/special-abilities-and-conditions.md',
]);

export const OGL_ATTRIBUTION =
  'Open Game Content from the System Reference Document 3.5, Copyright 2000-2003, Wizards of the ' +
  'Coast, Inc. Used under the Open Game License v1.0a.';

/** Progress callback invoked after each file is processed */
export type ProgressCallback = (fetched: number, total: number | null) => void;

interface MarkdownSection {
  heading: string;
  body: string;
}

/**
 * Split markdown on headings from `##` down to `maxDepth`, dropping the preamble
 * (the OGL notice and chapter title). A `###` heading is prefixed with its `##`
 * parent so the chunk keeps its context.
 */
function splitSections(markdown: string, maxDepth: 2 | 3): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  let parent: string | null = null;
  let heading: string | null = null;
  let lines: string[] = [];
  const flush = () => {
    const body = lines.join('\n').trim();
    if (heading && body) sections.push({ heading, body });
  };
  for (const lineText of markdown.split(/\r?\n/)) {
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(lineText);
    if (match && match[1].length <= maxDepth) {
      flush();
      if (match[1].length === 2) {
        parent = match[2];
        heading = match[2];
      } else {
        heading = parent ? `${parent} — ${match[2]}` : match[2];
      }
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
    .filter((p) => SPELL_FILE.test(p) || RULES_FILES.has(p));

  let done = 0;
  for (const path of files) {
    const url = `https://raw.githubusercontent.com/${REPO}/${COMMIT}/${path}`;
    const res = await fetchWithRetry(url);
    if (!res.ok) throw new Error(`SRD 3.5 fetch failed for ${path}: ${res.status} ${res.statusText}`);
    const markdown = await res.text();

    // The file's own "# TITLE" line names the chapter (e.g. "SPELLS (A-B)").
    const chapter = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? path;
    const isRules = RULES_FILES.has(path);
    const category = isRules ? 'rule' : path.includes('spell-list') ? 'spell_list' : 'spell';

    for (const section of splitSections(markdown, isRules ? 3 : 2)) {
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
