'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { listCampaignScenes, type SceneAsset } from '@/lib/campaigns/scene-assets';
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
  const [error, setError] = useState('');
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset to a fresh loading state whenever the modal transitions to open —
  // adjusted during render (React's recommended pattern) rather than via a
  // synchronous setState at the top of the effect below.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setLoading(true);
      setError('');
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listCampaignScenes(campaignId).then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      setAssets(result.assets);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, campaignId]);

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

        {loading ? (
          <p className={styles.placeholder}>Loading…</p>
        ) : error ? (
          <p className={styles.errorMsg}>{error}</p>
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
