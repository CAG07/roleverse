'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  listCampaignScenes,
  uploadCampaignScene,
  SCENE_BUCKET,
  SCENE_CAMPAIGN_QUOTA_BYTES,
  type SceneAsset,
} from '@/lib/campaigns/scene-assets';
import { getUsedBytes } from '@/lib/storage/check-quota';
import styles from './CampaignScenesPanel.module.css';

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CampaignScenesPanel({ campaignId }: { campaignId: string }) {
  const [assets, setAssets] = useState<SceneAsset[]>([]);
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
      const result = await listCampaignScenes(campaignId);
      if (cancelled) return;

      setFolderPath(result.folderPath);
      if (result.error) {
        setError(result.error);
      } else {
        setAssets(result.assets);
      }

      if (result.folderPath) {
        const supabase = createClient();
        const used = await getUsedBytes(supabase, SCENE_BUCKET, result.folderPath);
        if (!cancelled) setUsedBytes(used);
      }

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setUploading(true);
    const { asset, error: uploadError } = await uploadCampaignScene(campaignId, file);
    if (uploadError || !asset) {
      setError(uploadError ?? 'Failed to upload file.');
    } else {
      setAssets((prev) => [...prev, asset]);
      setUsedBytes((prev) => (prev ?? 0) + file.size);
    }
    setUploading(false);
  };

  const handleDelete = async (name: string) => {
    if (!folderPath) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.storage.from(SCENE_BUCKET).remove([`${folderPath}/${name}`]);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setAssets((prev) => prev.filter((a) => a.name !== name));
    // SceneAsset doesn't carry file size, so re-fetch the aggregate rather
    // than trying to subtract a delta we don't have.
    const used = await getUsedBytes(supabase, SCENE_BUCKET, folderPath);
    setUsedBytes(used);
  };

  return (
    <div className={styles.infoPanel}>
      <h3 className={styles.infoPanelTitle}>Scene Library</h3>

      {usedBytes !== null && (
        <div className={styles.quotaWrap}>
          <div className={styles.quotaTrack} role="progressbar" aria-label="Storage used">
            <div
              className={`${styles.quotaFill} ${usedBytes / SCENE_CAMPAIGN_QUOTA_BYTES >= 0.9 ? styles.quotaFillWarning : ''}`}
              style={{ width: `${Math.min(100, (usedBytes / SCENE_CAMPAIGN_QUOTA_BYTES) * 100)}%` }}
            />
          </div>
          <span className={styles.quotaLabel}>
            {formatSize(usedBytes)} of {formatSize(SCENE_CAMPAIGN_QUOTA_BYTES)} used
          </span>
        </div>
      )}

      {loading ? (
        <p className={styles.placeholder}>Loading…</p>
      ) : assets.length > 0 ? (
        <div className={styles.assetGrid}>
          {assets.map((a) => (
            <div key={a.name} className={styles.assetTile}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.displayName} className={styles.assetThumb} />
              <button
                type="button"
                className={styles.btnDelete}
                onClick={() => void handleDelete(a.name)}
                aria-label={`Delete ${a.displayName}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.placeholder}>
          No scene photos uploaded yet. Attach one during play from the session view once
          it&apos;s here.
        </p>
      )}

      <div className={styles.uploadRow}>
        <input
          type="file"
          accept="image/*"
          id="campaignSceneUpload"
          className={styles.fileInput}
          onChange={(e) => void handleUpload(e)}
          disabled={uploading}
        />
        <label htmlFor="campaignSceneUpload" className={styles.btnUpload} aria-disabled={uploading}>
          {uploading ? 'Uploading…' : '+ Upload Photo'}
        </label>
        <p className={styles.formHint}>
          Images up to 5MB, 25MB total per campaign.
        </p>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  );
}
