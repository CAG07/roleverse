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
import {
  listCampaignVideos,
  deleteCampaignVideo,
  youtubeThumbnailUrl,
  type CampaignVideo,
} from '@/lib/campaigns/campaign-videos';
import AddYoutubeVideoForm from './AddYoutubeVideoForm';
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
  /** YouTube links added by hand — stored as rows, not files, so they don't count toward the quota. */
  const [videos, setVideos] = useState<CampaignVideo[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [result, videoResult] = await Promise.all([
        listCampaignScenes(campaignId),
        listCampaignVideos(campaignId),
      ]);
      if (cancelled) return;

      setFolderPath(result.folderPath);
      if (result.error) {
        setError(result.error);
      } else {
        setAssets(result.assets);
      }
      if (videoResult.error) {
        setError(videoResult.error);
      } else {
        setVideos(videoResult.videos);
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

  const handleDeleteVideo = async (video: CampaignVideo) => {
    const { error: deleteError } = await deleteCampaignVideo(video.id);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
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

      {!loading && videos.length > 0 && (
        <div className={styles.videoGrid}>
          {videos.map((v) => {
            const label = v.title ?? 'YouTube video';
            return (
              <div key={v.id} className={styles.videoTile}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={youtubeThumbnailUrl(v.videoId)} alt={label} className={styles.assetThumb} />
                <span className={styles.videoBadge} aria-hidden="true">▶</span>
                <span className={styles.videoTitle}>{label}</span>
                <button
                  type="button"
                  className={styles.btnDelete}
                  onClick={() => void handleDeleteVideo(v)}
                  aria-label={`Delete ${label}`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <AddYoutubeVideoForm
        campaignId={campaignId}
        idPrefix="campaignScenes"
        onAdded={(video) => setVideos((prev) => [...prev, video])}
      />

      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  );
}
