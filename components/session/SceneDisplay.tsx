'use client';

import { useState, type MouseEvent } from 'react';
import { X, Maximize2, Image as ImageIcon } from 'lucide-react';
import type { SceneMedia } from '@/lib/types/session';
import styles from './SceneDisplay.module.css';

interface SceneDisplayProps {
  media: SceneMedia | null;
  onClose?: () => void;
  /** Render a slim single-row placeholder instead of the full empty state (used
   * when the scene panel has collapsed because there's no media to show). */
  compact?: boolean;
}

export default function SceneDisplay({ media, onClose, compact = false }: SceneDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!media) {
    if (compact) {
      return (
        <div className={styles.sceneEmptyCompact}>
          <ImageIcon size={14} className={styles.emptyIcon} />
          <span className={styles.emptyLabel}>Scene Display</span>
        </div>
      );
    }
    return (
      <div className={styles.sceneEmpty}>
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />
        <ImageIcon size={32} className={styles.emptyIcon} />
        <span className={styles.emptyLabel}>Scene Display</span>
        <span className={styles.emptySub}>
          AI-generated scenes and campaign art will appear here
        </span>
      </div>
    );
  }

  return (
    <>
      <div className={styles.scenePanel}>
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        <div className={styles.mediaContainer}>
          {media.type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt={media.caption ?? 'Scene image'} className={styles.sceneImg} />
          ) : (
            <video src={media.url} controls className={styles.sceneVideo} />
          )}
          <span className={styles.sourceLabel}>
            {media.source === 'ai_generated' ? 'AI Generated' : 'Campaign Asset'}
          </span>
          <div className={styles.controls}>
            <button
              className={styles.ctrlBtn}
              onClick={() => setExpanded(true)}
              aria-label="Expand"
              type="button"
            >
              <Maximize2 size={14} />
            </button>
            <button
              className={`${styles.ctrlBtn} ${styles.close}`}
              onClick={onClose}
              aria-label="Close scene"
              type="button"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {media.caption && (
          <div className={styles.caption}>
            <ImageIcon
              size={12}
              color="var(--gold-dim)"
              style={{ marginTop: '2px', flexShrink: 0 }}
            />
            <p className={styles.captionText}>{media.caption}</p>
          </div>
        )}
      </div>

      {expanded && (
        <div className={styles.lightbox} onClick={() => setExpanded(false)}>
          <div
            className={styles.lightboxInner}
            onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <button
              className={styles.lightboxClose}
              onClick={() => setExpanded(false)}
              aria-label="Close fullscreen"
              type="button"
            >
              <X size={14} />
            </button>
            {media.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media.url}
                alt={media.caption ?? 'Scene image'}
                className={styles.lightboxImg}
              />
            ) : (
              <video src={media.url} controls autoPlay className={styles.lightboxVideo} />
            )}
            {media.caption && <p className={styles.lightboxCaption}>{media.caption}</p>}
          </div>
        </div>
      )}
    </>
  );
}
