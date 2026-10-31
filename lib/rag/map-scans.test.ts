// lib/rag/map-scans.test.ts
import { describe, expect, it } from 'vitest';

import { CLAIM_TIMEOUT_MS, nextUnreadPage, toMapScan } from './map-scans';

const result = (pageNumber: number) => ({ pageNumber, mapsFound: 1, roomsFound: 10, truncated: false, read: true });

describe('nextUnreadPage', () => {
  it('returns the first map page without a result', () => {
    expect(nextUnreadPage({ mapPages: [3, 18, 30], pageResults: [result(3)] })).toBe(18);
  });

  it('is null once every map page has a result, unreadable pages included', () => {
    expect(
      nextUnreadPage({ mapPages: [3, 18], pageResults: [result(3), { ...result(18), read: false }] })
    ).toBeNull();
  });
});

describe('toMapScan', () => {
  const row = {
    file_name: '123-module.pdf',
    status: 'reading' as const,
    map_pages: [3, 18],
    page_results: [result(3)],
    error: null,
  };
  const now = Date.parse('2026-10-31T12:00:00Z');

  it('is busy while a fresh claim is held', () => {
    const claimedAt = new Date(now - 60_000).toISOString();
    expect(toMapScan({ ...row, claimed_at: claimedAt }, now).busy).toBe(true);
  });

  it('treats a claim older than the request time limit as abandoned', () => {
    const claimedAt = new Date(now - CLAIM_TIMEOUT_MS - 1000).toISOString();
    expect(toMapScan({ ...row, claimed_at: claimedAt }, now).busy).toBe(false);
  });

  it('maps columns and tolerates missing lists', () => {
    expect(toMapScan({ ...row, map_pages: null, page_results: null, claimed_at: null }, now)).toEqual({
      fileName: '123-module.pdf',
      status: 'reading',
      mapPages: [],
      pageResults: [],
      error: null,
      busy: false,
    });
  });
});
