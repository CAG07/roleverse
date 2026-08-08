'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { assertWithinQuota, getUsedBytes } from '@/lib/storage/check-quota';
import styles from './CampaignFilesPanel.module.css';

const FILE_MAX_BYTES = 20 * 1024 * 1024; // 20MB per file
const CAMPAIGN_QUOTA_BYTES = 25 * 1024 * 1024; // 25MB per campaign (half of the 50MB combined ceiling)
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
      } else {
        setFiles(
          (listData ?? [])
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
            }))
        );
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const handleIndex = async (name: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.name === name ? { ...f, indexStatus: 'indexing', indexError: undefined } : f))
    );
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
      setFiles((prev) => prev.map((f) => (f.name === name ? { ...f, indexStatus: 'indexed' } : f)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to index file.';
      setFiles((prev) =>
        prev.map((f) => (f.name === name ? { ...f, indexStatus: 'error', indexError: message } : f))
      );
    }
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
        PDF, plain text, or Markdown files are indexed automatically after upload so the Rules
        Arbiter can search their contents during play — this only helps with rules questions.
        A PDF needs an actual text layer (not a scanned image). Up to 20MB per file, 25MB total
        per campaign.
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
                  onClick={() => void handleDelete(f.name)}
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
    </div>
  );
}
