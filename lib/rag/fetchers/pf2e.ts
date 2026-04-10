// lib/rag/fetchers/pf2e.ts
// Fetches Pathfinder 2E SRD content from the Foundry VTT pf2e system compendium.
// Source: https://github.com/foundryvtt/pf2e (MIT licensed)
//
// The Foundry VTT pf2e repo stores compendium packs in LevelDB format (.db).
// This fetcher targets the GitHub releases API to download pre-built pack data
// and parses each entry into RagChunks.
//
// IMPORTANT: This fetcher downloads large amounts of data (200–500 MB).
// Set GITHUB_TOKEN env var to avoid GitHub API rate limits.

import type { RagChunk } from '../types';

const GITHUB_API = 'https://api.github.com';
const PF2E_REPO = 'foundryvtt/pf2e';

/** Compendium pack names to ingest (SRD-equivalent content only) */
const TARGET_PACKS = [
  'spells',
  'bestiary-ability-glossary-srd',
  'bestiary-family-ability-glossary',
  'boons-and-curses',
  'feat-effects',
  'feats-srd',
  'action-macros',
  'pf2e-macros',
  'conditions',
  'equipment-srd',
] as const;

/** Progress callback invoked after each entry is processed */
export type ProgressCallback = (fetched: number, total: number | null) => void;

/** Shape of a Foundry pf2e compendium entry (minimal) */
interface FoundryEntry {
  _id?: string;
  name?: string;
  type?: string;
  system?: Record<string, unknown>;
  flags?: Record<string, unknown>;
}

/**
 * Fetch PF2E SRD content from Foundry VTT pf2e GitHub release assets.
 *
 * The fetcher:
 * 1. Finds the latest pf2e release via the GitHub API.
 * 2. Looks for a release asset containing exported pack JSON (if present in release).
 * 3. Falls back to fetching individual pack DB files from the raw repo content.
 *
 * Because the Foundry pf2e repo uses LevelDB (.db) format for packs in v5+,
 * and parsing LevelDB requires native bindings not available in all environments,
 * this fetcher uses the GitHub contents API to read the raw pack entries stored
 * as JSON Lines in older-format packs, or falls back to a stub if the format
 * is not parseable in the current environment.
 */
export async function* fetchPf2eChunks(
  onProgress?: ProgressCallback
): AsyncGenerator<RagChunk> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Get the latest release to find the commit SHA / tag for stable content
  let commitSha = 'master';
  try {
    const releaseResponse = await fetch(
      `${GITHUB_API}/repos/${PF2E_REPO}/releases/latest`,
      { headers, signal: AbortSignal.timeout(15_000) }
    );

    if (releaseResponse.ok) {
      const release = (await releaseResponse.json()) as { tag_name?: string };
      if (release.tag_name) {
        commitSha = release.tag_name;
      }
    }
  } catch {
    // Non-fatal: fall back to master if GitHub API is unreachable or slow
  }

  let totalYielded = 0;

  for (const packName of TARGET_PACKS) {
    // Attempt to fetch pack data as JSON Lines from the repo (pre-v5 format)
    const jsonlUrl = `https://raw.githubusercontent.com/${PF2E_REPO}/${commitSha}/packs/${packName}.db`;
    const jsonUrl = `https://raw.githubusercontent.com/${PF2E_REPO}/${commitSha}/packs/${packName}.json`;

    let packText: string | null = null;

    // Try .json first, then .db (which may be JSONL in older versions)
    for (const url of [jsonUrl, jsonlUrl]) {
      try {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: AbortSignal.timeout(60_000),
        });
        if (res.ok) {
          packText = await res.text();
          break;
        }
      } catch {
        // Timeout or network error — try next URL or skip pack
        continue;
      }
    }

    if (!packText) {
      // Pack not found in this release format — skip and continue
      continue;
    }

    const entries = parsePackText(packText);

    for (const entry of entries) {
      const chunk = entryToChunk(entry, packName);
      if (chunk) {
        yield chunk;
        totalYielded++;
        onProgress?.(totalYielded, null);
      }
    }
  }

  if (totalYielded === 0) {
    // Yield a stub chunk so the system row exists in the index
    yield buildPf2eStubChunk();
    onProgress?.(1, 1);
  }
}

/** Parse pack text — handles both JSON array and newline-delimited JSON (JSONL) */
function parsePackText(text: string): FoundryEntry[] {
  const trimmed = text.trim();
  if (trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed) as FoundryEntry[];
    } catch {
      return [];
    }
  }

  // Newline-delimited JSON
  return trimmed
    .split('\n')
    .map((line) => {
      try {
        return JSON.parse(line.trim()) as FoundryEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is FoundryEntry => e !== null);
}

/** Convert a Foundry compendium entry to a RagChunk */
function entryToChunk(entry: FoundryEntry, packName: string): RagChunk | null {
  const name = entry.name?.trim();
  if (!name) return null;

  const system = entry.system ?? {};
  const parts: string[] = [`## ${name}`];

  if (entry.type) {
    parts.push(`**Type:** ${entry.type}`);
  }

  // Extract description text
  const description = extractDescription(system);
  if (description) {
    parts.push(description);
  }

  // Extract key fields by type
  const extraFields = extractTypeFields(system, entry.type ?? '');
  if (extraFields) {
    parts.push(extraFields);
  }

  const content = parts.join('\n\n').trim();
  if (content.length < 30) return null;

  const category = packNameToCategory(packName);

  return {
    content,
    metadata: {
      gameSystem: 'PATHFINDER_2E',
      source: 'pf2e-foundry',
      category,
      title: name,
      packName,
      foundryType: entry.type,
      sourceUrl: `https://github.com/${PF2E_REPO}`,
    },
  };
}

function extractDescription(system: Record<string, unknown>): string {
  // PF2E stores description in system.description.value (HTML or plain text)
  const descObj = system['description'];
  if (!descObj) return '';

  if (typeof descObj === 'string') {
    return stripHtml(descObj);
  }
  if (typeof descObj === 'object' && descObj !== null) {
    const val = (descObj as Record<string, unknown>)['value'];
    if (typeof val === 'string') {
      return stripHtml(val);
    }
  }
  return '';
}

function extractTypeFields(system: Record<string, unknown>, type: string): string {
  const lines: string[] = [];

  switch (type) {
    case 'spell': {
      const traits = system['traits'];
      if (traits && typeof traits === 'object') {
        const t = traits as Record<string, unknown>;
        if (Array.isArray(t['value']) && t['value'].length > 0) {
          lines.push(`**Traits:** ${(t['value'] as string[]).join(', ')}`);
        }
      }
      const level = system['level'];
      if (level && typeof level === 'object') {
        const l = level as Record<string, unknown>;
        if (l['value'] !== undefined) {
          lines.push(`**Level:** ${String(l['value'])}`);
        }
      }
      break;
    }
    case 'feat': {
      const level = system['level'];
      if (level && typeof level === 'object') {
        const l = level as Record<string, unknown>;
        if (l['value'] !== undefined) {
          lines.push(`**Level:** ${String(l['value'])}`);
        }
      }
      const prerequisites = system['prerequisites'];
      if (prerequisites && typeof prerequisites === 'object') {
        const p = prerequisites as Record<string, unknown>;
        if (Array.isArray(p['value']) && p['value'].length > 0) {
          lines.push(`**Prerequisites:** ${(p['value'] as Array<{ value: string }>).map((x) => x.value).join(', ')}`);
        }
      }
      break;
    }
    case 'condition': {
      const value = system['value'];
      if (value !== undefined) {
        lines.push(`**Value:** ${String(value)}`);
      }
      break;
    }
  }

  return lines.join('\n');
}

function packNameToCategory(packName: string): string {
  if (packName.includes('spell')) return 'spell';
  if (packName.includes('bestiary')) return 'monster';
  if (packName.includes('feat')) return 'feat';
  if (packName.includes('condition')) return 'condition';
  if (packName.includes('equipment')) return 'item';
  if (packName.includes('action')) return 'action';
  return 'rule';
}

/** Strip HTML tags from a string */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Fallback stub chunk when no Foundry pack data is reachable */
function buildPf2eStubChunk(): RagChunk {
  return {
    content: [
      '## Pathfinder 2E — Baseline Content Placeholder',
      '',
      'The Pathfinder 2E compendium data from Foundry VTT could not be fetched during this',
      'ingestion run. This is typically caused by network restrictions or a change in the',
      'Foundry VTT pf2e repository layout.',
      '',
      'The Rules Arbiter for PATHFINDER_2E will rely on training knowledge for PF2E queries',
      'until a successful ingestion run completes.',
      '',
      'To retry: trigger a new ingestion job from the Admin panel once the environment has',
      'outbound access to raw.githubusercontent.com and api.github.com.',
    ].join('\n'),
    metadata: {
      gameSystem: 'PATHFINDER_2E',
      source: 'pf2e-foundry',
      category: 'rule',
      title: 'PF2E Baseline — Stub (ingestion pending)',
      sourceUrl: `https://github.com/${PF2E_REPO}`,
    },
  };
}
