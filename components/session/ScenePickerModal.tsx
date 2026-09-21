'use client';

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { X } from 'lucide-react';
import { listCampaignScenes, uploadCampaignScene, type SceneAsset } from '@/lib/campaigns/scene-assets';
import type { SceneMedia } from '@/lib/types/session';
import styles from './ScenePickerModal.module.css';

interface ScenePickerModalProps {
  open: boolean;
  campaignId: string;
  onClose: () => void;
  onSelect: (media: SceneMedia) => void;
}

export default function ScenePickerModal({ open, campaignId, onClose, onSelect }: ScenePickerModalProps) {
  const [assets, setAssets] = useState<SceneAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset to a fresh loading state whenever the modal transitions to open —
  // adjusted during render (React's recommended pattern) rather than via a
  // synchronous setState at the top of the effect below.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setLoading(true);
      setListError('');
      setUploadError('');
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listCampaignScenes(campaignId).then((result) => {
      if (cancelled) return;
      if (result.error) setListError(result.error);
      setAssets(result.assets);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, campaignId]);

  const handleUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      setUploadError('');
      setUploading(true);
      const { asset, error: uploadErr } = await uploadCampaignScene(campaignId, file);
      if (uploadErr || !asset) {
        setUploadError(uploadErr ?? 'Failed to upload file.');
      } else {
        setAssets((prev) => [...prev, asset]);
      }
      setUploading(false);
    },
    [campaignId]
  );

  const handlePick = useCallback(
    (asset: SceneAsset) => {
      onSelect({
        id: `scene-${Date.now()}`,
        type: asset.type,
        url: asset.url,
        caption: asset.displayName,
        source: 'campaign_asset',
        timestamp: new Date(),
      });
      onClose();
    },
    [onSelect, onClose]
  );

  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Attach a scene"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Attach Scene</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className={styles.uploadRow}>
          <input
            type="file"
            accept="image/*"
            id="scenePickerUpload"
            className={styles.fileInput}
            onChange={(e) => void handleUpload(e)}
            disabled={uploading}
          />
          <label htmlFor="scenePickerUpload" className={styles.btnUpload} aria-disabled={uploading}>
            {uploading ? 'Uploading…' : '+ Upload New Photo'}
          </label>
        </div>
        {uploadError && <p className={styles.errorMsg}>{uploadError}</p>}

        {loading ? (
          <p className={styles.placeholder}>Loading…</p>
        ) : listError ? (
          <p className={styles.errorMsg}>{listError}</p>
        ) : assets.length > 0 ? (
          <div className={styles.assetGrid}>
            {assets.map((a) => (
              <button
                key={a.name}
                type="button"
                className={styles.assetTile}
                onClick={() => handlePick(a)}
                title={a.displayName}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.displayName} className={styles.assetThumb} />
              </button>
            ))}
          </div>
        ) : (
          <p className={styles.placeholder}>
            No scene photos yet — upload some from the campaign&apos;s Scene Library first.
          </p>
        )}
      </div>
    </div>
  );
}
