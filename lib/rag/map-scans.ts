// lib/rag/map-scans.ts
// Saved progress of reading one module PDF's maps (public.module_map_scans),
// so an interrupted scan resumes the next time the campaign is opened.
//
// Every step (finding map pages, reading one page) first claims the scan:
// claimed_at is set only if no other request holds a fresh claim. A claim
// older than CLAIM_TIMEOUT_MS (the maps route's 5-minute limit) is treated as
// abandoned. A step that can't claim the scan returns "busy", and the panel
// waits and checks again instead of reading the same page twice.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IndexMapPageResult } from './index-map-pages';

export const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

export type MapScanStatus = 'finding' | 'reading' | 'done' | 'failed';

export interface MapScan {
  fileName: string;
  status: MapScanStatus;
  mapPages: number[];
  pageResults: IndexMapPageResult[];
  error: string | null;
  /** True while a request is working on this scan. */
  busy: boolean;
}

interface MapScanRow {
  file_name: string;
  status: MapScanStatus;
  map_pages: number[] | null;
  page_results: unknown;
  error: string | null;
  claimed_at: string | null;
}

const COLUMNS = 'file_name, status, map_pages, page_results, error, claimed_at';

function staleBefore(): string {
  return new Date(Date.now() - CLAIM_TIMEOUT_MS).toISOString();
}

function unclaimedFilter(): string {
  return `claimed_at.is.null,claimed_at.lt."${staleBefore()}"`;
}

export function toMapScan(row: MapScanRow, now = Date.now()): MapScan {
  const claimedAt = row.claimed_at ? new Date(row.claimed_at).getTime() : null;
  return {
    fileName: row.file_name,
    status: row.status,
    mapPages: row.map_pages ?? [],
    pageResults: Array.isArray(row.page_results) ? (row.page_results as IndexMapPageResult[]) : [],
    error: row.error,
    busy: claimedAt !== null && now - claimedAt < CLAIM_TIMEOUT_MS,
  };
}

/** The next map page that hasn't been read yet, or null when all are done. */
export function nextUnreadPage(scan: Pick<MapScan, 'mapPages' | 'pageResults'>): number | null {
  const done = new Set(scan.pageResults.map((r) => r.pageNumber));
  return scan.mapPages.find((page) => !done.has(page)) ?? null;
}

export async function listMapScans(supabase: SupabaseClient, campaignId: string): Promise<MapScan[]> {
  const { data, error } = await supabase.from('module_map_scans').select(COLUMNS).eq('campaign_id', campaignId);
  if (error) throw new Error(`Failed to load map scans: ${error.message}`);
  return ((data ?? []) as MapScanRow[]).map((row) => toMapScan(row));
}

/**
 * Starts (or restarts) a scan of this file and claims it. False when another
 * request is already working on it.
 */
export async function claimNewScan(
  supabase: SupabaseClient,
  campaignId: string,
  userId: string,
  fileName: string
): Promise<boolean> {
  const { error: insertError } = await supabase
    .from('module_map_scans')
    .upsert(
      { campaign_id: campaignId, owner_id: userId, file_name: fileName, status: 'finding' },
      { onConflict: 'campaign_id,file_name', ignoreDuplicates: true }
    );
  if (insertError) throw new Error(`Failed to start the map scan: ${insertError.message}`);

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('module_map_scans')
    .update({
      status: 'finding',
      map_pages: [],
      page_results: [],
      error: null,
      claimed_at: now,
      updated_at: now,
    })
    .eq('campaign_id', campaignId)
    .eq('file_name', fileName)
    .or(unclaimedFilter())
    .select('file_name');
  if (error) throw new Error(`Failed to start the map scan: ${error.message}`);
  return (data ?? []).length > 0;
}

/** Records which pages hold maps (or why the check failed) and releases the claim. */
export async function finishFindingPages(
  supabase: SupabaseClient,
  campaignId: string,
  fileName: string,
  outcome: { mapPages: number[] } | { error: string }
): Promise<void> {
  const changes =
    'error' in outcome
      ? { status: 'failed' as const, error: outcome.error }
      : { status: outcome.mapPages.length > 0 ? ('reading' as const) : ('done' as const), map_pages: outcome.mapPages };
  const { error } = await supabase
    .from('module_map_scans')
    .update({ ...changes, claimed_at: null, updated_at: new Date().toISOString() })
    .eq('campaign_id', campaignId)
    .eq('file_name', fileName);
  if (error) throw new Error(`Failed to save map scan progress: ${error.message}`);
}

/** Claims a scan that is reading pages. Null when it's busy or not reading. */
export async function claimReadingScan(
  supabase: SupabaseClient,
  campaignId: string,
  fileName: string
): Promise<MapScan | null> {
  const { data, error } = await supabase
    .from('module_map_scans')
    .update({ claimed_at: new Date().toISOString() })
    .eq('campaign_id', campaignId)
    .eq('file_name', fileName)
    .eq('status', 'reading')
    .or(unclaimedFilter())
    .select(COLUMNS);
  if (error) throw new Error(`Failed to continue the map scan: ${error.message}`);
  const row = (data ?? [])[0] as MapScanRow | undefined;
  return row ? toMapScan(row) : null;
}

/**
 * Saves one page's result (null when there was nothing left to read), marks
 * the scan done after its last page, and releases the claim.
 */
export async function recordPageResult(
  supabase: SupabaseClient,
  campaignId: string,
  scan: MapScan,
  result: IndexMapPageResult | null
): Promise<MapScan> {
  const pageResults = result
    ? [...scan.pageResults.filter((r) => r.pageNumber !== result.pageNumber), result]
    : scan.pageResults;
  const updated: MapScan = { ...scan, pageResults, busy: false };
  updated.status = nextUnreadPage(updated) === null ? 'done' : 'reading';

  const { error } = await supabase
    .from('module_map_scans')
    .update({
      page_results: pageResults,
      status: updated.status,
      claimed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('campaign_id', campaignId)
    .eq('file_name', scan.fileName);
  if (error) throw new Error(`Failed to save map scan progress: ${error.message}`);
  return updated;
}

export async function deleteMapScan(supabase: SupabaseClient, campaignId: string, fileName: string): Promise<void> {
  const { error } = await supabase
    .from('module_map_scans')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('file_name', fileName);
  if (error) throw new Error(`Failed to remove the map scan: ${error.message}`);
}
