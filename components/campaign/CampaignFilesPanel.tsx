'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { assertWithinQuota, getUsedBytes } from '@/lib/storage/check-quota';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { MAP_SCAN_VERSION } from '@/lib/rag/map-scan-version';
import styles from './CampaignFilesPanel.module.css';

const FILE_MAX_BYTES = 50 * 1024 * 1024; // 50MB per file (Supabase Free plan per-upload cap)
const CAMPAIGN_QUOTA_BYTES = 100 * 1024 * 1024; // 100MB per campaign
const BUCKET = 'campaign-pdfs';
const ACCEPTED_EXTENSIONS = ['.pdf', '.txt', '.md'];
const ACCEPTED_MIME_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];

type IndexStatus = 'indexing' | 'indexed' | 'error';

interface FileEntry {
  /** Storage object name within the campaign's folder (timestamp-prefixed) — also
   *  the key used to match indexed chunks back to this file (metadata.title). */
  name: string;
  /** Original filename with the uniqueness prefix stripped, for display. */
  displayName: string;
  sizeBytes: number;
  indexStatus: IndexStatus;
  indexError?: string;
  /** Progress or result of the map reading that follows text indexing (PDFs only). */
  mapStatus?: string;
  readingMaps?: boolean;
}

interface MapPageResult {
  pageNumber: number;
  mapsFound: number;
  truncated: boolean;
  read: boolean;
}

/** Saved progress of one file's map reading (GET/POST .../modules/maps, lib/rag/map-scans.ts). */
interface MapScan {
  fileName: string;
  status: 'finding' | 'reading' | 'done' | 'failed';
  mapPages: number[];
  pageResults: MapPageResult[];
  error: string | null;
  busy: boolean;
  version: number;
}

/** How long to wait before checking again while another tab or request is reading. */
const BUSY_RETRY_MS = 10_000;

function isPdfFile(name: string): boolean {
  return name.toLowerCase().endsWith('.pdf');
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** Final status line after every map page has been read. */
function describeMapResults(results: MapPageResult[]): string {
  const maps = results.reduce((sum, r) => sum + r.mapsFound, 0);
  const parts = [`${plural(maps, 'map')} read`];
  const unreadable = results.filter((r) => !r.read).map((r) => r.pageNumber);
  if (unreadable.length > 0) parts.push(`could not read page ${unreadable.join(', ')}`);
  const truncated = results.filter((r) => r.truncated).map((r) => r.pageNumber);
  if (truncated.length > 0) parts.push(`page ${truncated.join(', ')} may be missing rooms`);
  return parts.join('; ');
}

function describeScan(scan: MapScan): string {
  switch (scan.status) {
    case 'finding':
      return 'Looking for maps…';
    case 'reading':
      return `Reading map page ${Math.min(scan.pageResults.length + 1, scan.mapPages.length)} of ${scan.mapPages.length}…`;
    case 'failed':
      return scan.error ?? 'Failed to read maps.';
    case 'done':
      return scan.mapPages.length === 0 ? 'No maps found' : describeMapResults(scan.pageResults);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchMapScans(campaignId: string): Promise<MapScan[]> {
  const res = await fetch(`/api/campaigns/${campaignId}/modules/maps`);
  if (!res.ok) throw new Error('Failed to load map reading progress.');
  return ((await res.json()) as { scans: MapScan[] }).scans;
}

async function errorFrom(res: Response, fallback: string): Promise<Error> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return new Error(body.error ?? fallback);
}

/**
 * Reads a file's maps one page per request, from its saved progress. restart
 * starts over (after upload, or "Re-scan maps"); otherwise an unfinished scan
 * continues where it stopped. While another tab or request holds the scan, it
 * waits and checks again, so a page is never read twice at once. Keeps going
 * after the panel unmounts (in-app navigation); a closed tab resumes on the
 * next visit instead.
 */
async function runMapScan(
  campaignId: string,
  fileName: string,
  restart: boolean,
  update: (changes: Partial<FileEntry>) => void
): Promise<void> {
  const url = `/api/campaigns/${campaignId}/modules/maps`;
  const request = (method: 'PUT' | 'POST') =>
    fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName }) });
  const loadScan = async () => (await fetchMapScans(campaignId)).find((s) => s.fileName === fileName) ?? null;

  update({ readingMaps: true, mapStatus: 'Looking for maps…' });
  try {
    let startOver = restart;
    let scan: MapScan | null = null;
    for (;;) {
      if (startOver) {
        startOver = false;
        const res = await request('PUT');
        if (res.status === 409) await sleep(BUSY_RETRY_MS);
        else if (!res.ok) throw await errorFrom(res, 'Failed to look for maps.');
        scan = await loadScan();
        continue;
      }
      if (!scan) break;
      update({ mapStatus: describeScan(scan) });

      if (scan.busy) {
        await sleep(BUSY_RETRY_MS);
        scan = await loadScan();
      } else if (scan.status === 'finding') {
        // The page check was interrupted: run it again.
        startOver = true;
      } else if (scan.status === 'reading') {
        const res = await request('POST');
        if (res.status === 409) {
          await sleep(BUSY_RETRY_MS);
          scan = await loadScan();
        } else if (!res.ok) {
          throw await errorFrom(res, 'Failed to read map page.');
        } else {
          scan = ((await res.json()) as { scan: MapScan }).scan;
        }
      } else {
        break;
      }
    }
    update({ readingMaps: false, mapStatus: scan ? describeScan(scan) : undefined });
  } catch (err) {
    update({ readingMaps: false, mapStatus: err instanceof Error ? err.message : 'Failed to read maps.' });
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Storage object names must be unique within a folder — prefix with a timestamp
// rather than prompting the player to resolve a collision.
function toStorageName(originalName: string): string {
  return `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

function toDisplayName(storageName: string): string {
  return storageName.replace(/^\d+-/, '');
}

export default function CampaignFilesPanel({ campaignId }: { campaignId: string }) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [folderPath, setFolderPath] = useState<string | null>(null);
  /** Total bytes already used in this campaign's folder — shown as a live
   * quota indicator so a player can see how much room is left before picking
   * a file, rather than only finding out when an upload is rejected. */
  const [usedBytes, setUsedBytes] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FileEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** Files whose map reading this panel is already driving (guards double starts). */
  const scansInProgress = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const path = `${user.id}/${campaignId}`;
      if (!cancelled) setFolderPath(path);

      const [{ data: listData, error: listError }, { data: indexedRows }, used] = await Promise.all([
        supabase.storage.from(BUCKET).list(path),
        // Selects only the title path out of metadata (not the full JSONB blob per
        // chunk) to keep payload down — still one row per chunk rather than per file,
        // since PostgREST has no lightweight DISTINCT here. A dedicated index-status
        // table/RPC would be the real fix if this proves slow with large modules.
        supabase
          .from('campaign_embeddings')
          .select('title:metadata->>title')
          .eq('campaign_id', campaignId)
          .eq('source_type', 'user_pdf'),
        getUsedBytes(supabase, BUCKET, path),
      ]);
      if (cancelled) return;
      setUsedBytes(used);

      const indexedNames = new Set(
        (indexedRows ?? [])
          .map((r) => (r as { title: string | null }).title)
          .filter((title): title is string => !!title)
      );

      if (listError) {
        setError(listError.message);
        setLoading(false);
        return;
      }

      const loaded: FileEntry[] = (listData ?? [])
        .filter((f) => f.id !== null) // exclude the placeholder row for empty folders
        .map((f) => ({
          name: f.name,
          displayName: toDisplayName(f.name),
          sizeBytes: (f.metadata?.size as number | undefined) ?? 0,
          // A file already in Storage that isn't yet indexed means an earlier
          // auto-index attempt never completed (e.g. tab closed mid-request) —
          // surface it as a retryable error rather than silently unindexed.
          indexStatus: indexedNames.has(f.name) ? ('indexed' as const) : ('error' as const),
          indexError: indexedNames.has(f.name) ? undefined : 'Not indexed yet.',
        }));
      setFiles(loaded);
      setLoading(false);

      // Map reading with no clicks: show each PDF's saved result, continue any
      // scan that was interrupted, and scan indexed PDFs that were never
      // scanned or were scanned by an older version. One file at a time.
      const scans = await fetchMapScans(campaignId).catch(() => null);
      if (!scans || cancelled) return;
      const byFile = new Map(scans.map((scan) => [scan.fileName, scan]));
      const toRun: { name: string; restart: boolean }[] = [];
      for (const f of loaded) {
        if (!isPdfFile(f.name) || f.indexStatus !== 'indexed') continue;
        const scan = byFile.get(f.name);
        // Never scanned, or scanned by an older version of map reading (no
        // map pictures for the Game Master): read it again.
        if (!scan || (scan.version < MAP_SCAN_VERSION && !scan.busy)) toRun.push({ name: f.name, restart: true });
        else if (scan.status === 'finding' || scan.status === 'reading') toRun.push({ name: f.name, restart: false });
        else {
          const mapStatus = describeScan(scan);
          setFiles((prev) => prev.map((p) => (p.name === f.name ? { ...p, mapStatus } : p)));
        }
      }
      for (const { name, restart } of toRun) {
        if (cancelled) return;
        if (scansInProgress.current.has(name)) continue;
        scansInProgress.current.add(name);
        await runMapScan(campaignId, name, restart, (changes) =>
          setFiles((prev) => prev.map((p) => (p.name === name ? { ...p, ...changes } : p)))
        );
        scansInProgress.current.delete(name);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const updateFile = (name: string, changes: Partial<FileEntry>) => {
    setFiles((prev) => prev.map((f) => (f.name === name ? { ...f, ...changes } : f)));
  };

  // Map reading runs after the text is indexed, one request per map page, so a
  // module with several large maps never hits a single request's time limit.
  // Always starts over: used after (re-)indexing and by "Re-scan maps".
  const handleReadMaps = async (name: string) => {
    if (scansInProgress.current.has(name)) return;
    scansInProgress.current.add(name);
    await runMapScan(campaignId, name, true, (changes) => updateFile(name, changes));
    scansInProgress.current.delete(name);
  };

  const handleIndex = async (name: string) => {
    updateFile(name, { indexStatus: 'indexing', indexError: undefined, mapStatus: undefined });
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/modules/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to index file.' }));
        throw new Error(body.error ?? 'Failed to index file.');
      }
      updateFile(name, { indexStatus: 'indexed' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to index file.';
      updateFile(name, { indexStatus: 'error', indexError: message });
      return;
    }
    if (isPdfFile(name)) await handleReadMaps(name);
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !folderPath) return;

    setError('');
    const lowerName = file.name.toLowerCase();
    // Browser MIME sniffing for .md is unreliable (often reports empty or
    // text/plain depending on OS), so accept on either a known MIME type OR a
    // recognized extension.
    const hasAcceptedExtension = ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    const hasAcceptedMime = ACCEPTED_MIME_TYPES.includes(file.type);
    if (!hasAcceptedExtension && !hasAcceptedMime) {
      setError('Only PDF, plain text, or Markdown files are supported.');
      return;
    }
    if (file.size > FILE_MAX_BYTES) {
      setError(`File must be ${FILE_MAX_BYTES / (1024 * 1024)}MB or smaller.`);
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      await assertWithinQuota(
        supabase,
        BUCKET,
        folderPath,
        file.size,
        CAMPAIGN_QUOTA_BYTES,
        'modules & files'
      );

      const storageName = toStorageName(file.name);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(`${folderPath}/${storageName}`, file, { contentType: file.type || 'application/octet-stream' });
      if (uploadError) throw uploadError;

      setFiles((prev) => [
        ...prev,
        {
          name: storageName,
          displayName: toDisplayName(storageName),
          sizeBytes: file.size,
          indexStatus: 'indexing',
        },
      ]);
      setUsedBytes((prev) => (prev ?? 0) + file.size);
      setUploading(false);
      // Fire-and-continue: indexing runs in the background from the player's point
      // of view — the row shows its own progress bar rather than blocking upload.
      void handleIndex(storageName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file.');
      setUploading(false);
    }
  };

  const handleDownload = async (name: string) => {
    if (!folderPath) return;
    const supabase = createClient();
    const { data, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(`${folderPath}/${name}`, 60);
    if (signError || !data) {
      setError(signError?.message ?? 'Failed to generate download link.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (name: string) => {
    if (!folderPath) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.storage.from(BUCKET).remove([`${folderPath}/${name}`]);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    const deleted = files.find((f) => f.name === name);
    setFiles((prev) => prev.filter((f) => f.name !== name));
    if (deleted) {
      setUsedBytes((prev) => (prev !== null ? Math.max(0, prev - deleted.sizeBytes) : prev));
    }

    // Best-effort — an indexed file that failed this cleanup just leaves a
    // harmless orphaned embedding row rather than blocking the delete.
    void fetch(`/api/campaigns/${campaignId}/modules/ingest`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: name }),
    }).catch(() => {});
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    await handleDelete(pendingDelete.name);
    setDeleting(false);
    setPendingDelete(null);
  };

  return (
    <div className={styles.infoPanel}>
      <h3 className={styles.infoPanelTitle}>Modules &amp; Files</h3>

      {usedBytes !== null && (
        <div className={styles.quotaWrap}>
          <div className={styles.quotaTrack} role="progressbar" aria-label="Storage used">
            <div
              className={`${styles.quotaFill} ${usedBytes / CAMPAIGN_QUOTA_BYTES >= 0.9 ? styles.quotaFillWarning : ''}`}
              style={{ width: `${Math.min(100, (usedBytes / CAMPAIGN_QUOTA_BYTES) * 100)}%` }}
            />
          </div>
          <span className={styles.quotaLabel}>
            {formatSize(usedBytes)} of {formatSize(CAMPAIGN_QUOTA_BYTES)} used
          </span>
        </div>
      )}

      <p className={styles.explainer}>
        PDF, plain text, or Markdown files are indexed automatically after upload. The Game
        Master uses them to run your module, and the Rules Arbiter uses them for rules questions,
        ahead of the built-in rules. Map detection is best-effort: pages with little extracted
        text can be read as images to help identify room numbers and connections, with map
        references kept separate by page and label. PDFs still need a real text layer; fully
        scanned PDFs can&apos;t be indexed. Up to 50MB per file, 100MB total per campaign.
      </p>

      {loading ? (
        <p className={styles.placeholder}>Loading…</p>
      ) : files.length > 0 ? (
        <div className={styles.fileList}>
          {files.map((f) => (
            <div key={f.name} className={styles.fileRow}>
              <div className={styles.fileMain}>
                <button
                  type="button"
                  className={styles.fileName}
                  onClick={() => void handleDownload(f.name)}
                  title="Download"
                >
                  {f.displayName}
                </button>
                <span className={styles.fileSize}>{formatSize(f.sizeBytes)}</span>
                <button
                  type="button"
                  className={styles.btnDelete}
                  onClick={() => setPendingDelete(f)}
                  aria-label={`Delete ${f.displayName}`}
                >
                  ×
                </button>
              </div>

              {f.indexStatus === 'indexing' && (
                <div className={styles.progressTrack} role="progressbar" aria-label="Indexing">
                  <div className={styles.progressBar} />
                </div>
              )}
              {f.indexStatus === 'indexed' && <span className={styles.statusIndexed}>Indexed ✓</span>}
              {f.indexStatus === 'indexed' && isPdfFile(f.name) && (
                <div className={styles.mapRow}>
                  {f.mapStatus && <span className={styles.mapStatus}>{f.mapStatus}</span>}
                  <button
                    type="button"
                    className={styles.btnRetry}
                    onClick={() => void handleReadMaps(f.name)}
                    disabled={f.readingMaps}
                  >
                    Re-scan maps
                  </button>
                </div>
              )}
              {f.indexStatus === 'error' && (
                <div className={styles.statusErrorRow}>
                  <span className={styles.statusError}>{f.indexError ?? 'Indexing failed.'}</span>
                  <button type="button" className={styles.btnRetry} onClick={() => void handleIndex(f.name)}>
                    Retry
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.placeholder}>No modules or files uploaded yet.</p>
      )}

      <div className={styles.uploadRow}>
        <input
          type="file"
          accept="application/pdf,text/plain,text/markdown,.pdf,.txt,.md"
          id="campaignFileUpload"
          className={styles.fileInput}
          onChange={(e) => void handleUpload(e)}
          disabled={uploading}
        />
        <label htmlFor="campaignFileUpload" className={styles.btnUpload} aria-disabled={uploading}>
          {uploading ? 'Uploading…' : '+ Upload File'}
        </label>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <ConfirmModal
        open={pendingDelete !== null}
        title="Delete File"
        message={`Delete "${pendingDelete?.displayName ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
