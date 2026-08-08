'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { listCampaignScenes, toDisplayName, type SceneAsset } from '@/lib/campaigns/scene-assets';
import { assertWithinQuota } from '@/lib/storage/check-quota';
import styles from './CampaignScenesPanel.module.css';

const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB per file
const CAMPAIGN_QUOTA_BYTES = 25 * 1024 * 1024; // 25MB per campaign (half of the 50MB combined ceiling)
const BUCKET = 'campaign-scenes';

function toStorageName(originalName: string): string {
  return `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

export default function CampaignScenesPanel({ campaignId }: { campaignId: string }) {
  const [assets, setAssets] = useState<SceneAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [folderPath, setFolderPath] = useState<string | null>(null);

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
    if (!file || !folderPath) return;

    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported.');
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setError(`Image must be ${IMAGE_MAX_BYTES / (1024 * 1024)}MB or smaller.`);
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
        'scene library'
      );

      const storageName = toStorageName(file.name);
      const path = `${folderPath}/${storageName}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);

      setAssets((prev) => [
        ...prev,
        {
          name: storageName,
          displayName: toDisplayName(storageName),
          type: 'image',
          url: publicUrl,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!folderPath) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.storage.from(BUCKET).remove([`${folderPath}/${name}`]);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setAssets((prev) => prev.filter((a) => a.name !== name));
  };

  return (
    <div className={styles.infoPanel}>
      <h3 className={styles.infoPanelTitle}>Scene Library</h3>

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
