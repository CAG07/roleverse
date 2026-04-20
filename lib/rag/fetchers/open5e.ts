// lib/rag/fetchers/open5e.ts
// Fetches 5E 2014 SRD content from the Open5e public REST API.
// Uses the v1 API (https://api.open5e.com/v1/) with the wotc-srd document filter
// to ingest only the WotC System Reference Document 5.1 content (CC-BY-4.0),
// excluding third-party publisher content (Kobold Press, Level Up, etc.)
// that Open5e also hosts.
//
// See: https://api.open5e.com/v1/ and https://github.com/open5e/open5e-api

import type { RagChunk } from '../types';
import { fetchWithRetry } from './utils';

/** All SRD content is served under the /v1/ prefix */
const BASE_URL = 'https://api.open5e.com/v1';
/** Page size for paginated endpoints */
const PAGE_SIZE = 200;

/** Endpoints to ingest and how to map them to chunks */
interface Open5eEndpoint {
  path: string;
  category: string;
  titleField: string;
  contentFields: string[];
}

const ENDPOINTS: Open5eEndpoint[] = [
  {
    path: '/spells/',
    category: 'spell',
    titleField: 'name',
    contentFields: ['desc', 'higher_level', 'range', 'duration', 'casting_time', 'components'],
  },
  {
    path: '/monsters/',
    category: 'monster',
    titleField: 'name',
    contentFields: ['desc', 'actions', 'special_abilities', 'legendary_actions'],
  },
  {
    path: '/classes/',
    category: 'class',
    titleField: 'name',
    contentFields: ['desc', 'hit_die', 'prof_skills', 'prof_weapons', 'prof_armor', 'archetypes'],
  },
  {
    path: '/races/',
    category: 'race',
    titleField: 'name',
    contentFields: ['desc', 'traits', 'speed', 'size'],
  },
  {
    path: '/sections/',
    category: 'rule',
    titleField: 'name',
    contentFields: ['desc'],
  },
  {
    path: '/feats/',
    category: 'feat',
    titleField: 'name',
    contentFields: ['desc', 'prerequisite'],
  },
  {
    path: '/conditions/',
    category: 'condition',
    titleField: 'name',
    contentFields: ['desc'],
  },
  {
    path: '/magicitems/',
    category: 'magic_item',
    titleField: 'name',
    contentFields: ['desc', 'type', 'rarity'],
  },
];

/** Progress callback invoked after each page is fetched */
export type ProgressCallback = (fetched: number, total: number | null) => void;

/**
 * Fetch all SRD content from Open5e and yield RagChunks.
 * Each API result object becomes one chunk (the chunking pass in ingest.ts handles
 * splitting long entries further).
 */
export async function* fetchOpen5eChunks(
  onProgress?: ProgressCallback
): AsyncGenerator<RagChunk> {
  for (const endpoint of ENDPOINTS) {
    yield* fetchEndpointChunks(endpoint, onProgress);
  }
}

async function* fetchEndpointChunks(
  endpoint: Open5eEndpoint,
  onProgress?: ProgressCallback
): AsyncGenerator<RagChunk> {
  let url: string | null = `${BASE_URL}${endpoint.path}?document__slug=wotc-srd&limit=${PAGE_SIZE}`;
  let total: number | null = null;
  let fetched = 0;

  while (url) {
    const response = await fetchWithRetry(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Open5e fetch failed for ${endpoint.path}: ${response.status} ${response.statusText}`);
    }

    const page = (await response.json()) as {
      count?: number;
      next?: string | null;
      results: Record<string, unknown>[];
    };

    if (total === null && typeof page.count === 'number') {
      total = page.count;
    }

    for (const item of page.results ?? []) {
      const title = typeof item[endpoint.titleField] === 'string'
        ? (item[endpoint.titleField] as string)
        : undefined;

      const contentParts: string[] = [];
      if (title) contentParts.push(`## ${title}`);

      for (const field of endpoint.contentFields) {
        const value = item[field];
        if (!value) continue;

        if (typeof value === 'string' && value.trim()) {
          contentParts.push(value.trim());
        } else if (Array.isArray(value)) {
          const serialised = value
            .map((v) => (typeof v === 'object' && v !== null ? serialiseObject(v) : String(v)))
            .filter(Boolean)
            .join('\n\n');
          if (serialised) contentParts.push(serialised);
        } else if (typeof value === 'object' && value !== null) {
          const serialised = serialiseObject(value as Record<string, unknown>);
          if (serialised) contentParts.push(serialised);
        }
      }

      const content = contentParts.join('\n\n').trim();
      if (content.length < 20) continue; // skip near-empty entries

      yield {
        content,
        metadata: {
          gameSystem: '5E_2014',
          source: 'open5e',
          category: endpoint.category,
          title,
          sourceUrl: `${BASE_URL}${endpoint.path}`,
        },
      };

      fetched++;
      onProgress?.(fetched, total);
    }

    url = page.next ?? null;
  }
}

/** Convert a JSON object to a readable text block for embedding */
function serialiseObject(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => {
      const key = k.replace(/_/g, ' ');
      const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `**${key}:** ${val}`;
    })
    .join('\n');
}
