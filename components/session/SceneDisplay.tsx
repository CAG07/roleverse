'use client';

import { useState, type MouseEvent } from 'react';
import { X, Maximize2, Image as ImageIcon } from 'lucide-react';
import type { SceneMedia } from '@/lib/types/session';

interface SceneDisplayProps {
  media: SceneMedia | null;
  onClose?: () => void;
}

export default function SceneDisplay({ media, onClose }: SceneDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!media) return null;

  return (
    <>
      <style jsx>{`
        .scene-panel {
          position: relative;
          display: flex;
          height: 100%;
          flex-direction: column;
          overflow: hidden;
          background: var(--void);
          border: var(--rule-thin);
        }

        /* Corner ornaments */
        .corner {
          position: absolute;
          width: 14px;
          height: 14px;
          z-index: 2;
        }
        .corner.tl { top: 6px; left: 6px; border-top: 1px solid var(--gold); border-left: 1px solid var(--gold); }
        .corner.tr { top: 6px; right: 6px; border-top: 1px solid var(--gold); border-right: 1px solid var(--gold); }
        .corner.bl { bottom: 6px; left: 6px; border-bottom: 1px solid var(--gold); border-left: 1px solid var(--gold); }
        .corner.br { bottom: 6px; right: 6px; border-bottom: 1px solid var(--gold); border-right: 1px solid var(--gold); }

        /* Crimson accent on top */
        .scene-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--crimson), var(--gold-dim), var(--crimson), transparent);
          z-index: 2;
        }

        .media-container {
          position: relative;
          flex: 1;
          min-height: 0;
          width: 100%;
          overflow: hidden;
          background: #000;
        }

        .scene-img,
        .scene-video {
          height: 100%;
          width: 100%;
          object-fit: contain;
        }

        .source-label {
          position: absolute;
          left: 0.5rem;
          top: 0.5rem;
          background: rgba(0,0,0,0.7);
          border: var(--rule-thin);
          font-family: var(--font-heading);
          font-size: 0.575rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.2rem 0.5rem;
          color: var(--ivory-muted);
          z-index: 1;
        }

        .controls {
          position: absolute;
          right: 0.5rem;
          top: 0.5rem;
          display: flex;
          gap: 0.25rem;
          z-index: 1;
        }
        .ctrl-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: rgba(0,0,0,0.7);
          border: var(--rule-thin);
          color: var(--ivory-muted);
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
        }
        .ctrl-btn:hover {
          color: var(--gold);
          border-color: var(--gold-dim);
        }
        .ctrl-btn.close:hover {
          color: var(--crimson-bright);
          border-color: var(--crimson-dim);
        }

        /* Caption */
        .caption {
          display: flex;
          align-items: flex-start;
          gap: 0.375rem;
          background: var(--void-mid);
          padding: 0.5rem 0.75rem;
          border-top: var(--rule-thin);
        }
        .caption-text {
          font-family: var(--font-body);
          font-size: 0.8rem;
          font-style: italic;
          color: var(--ivory-muted);
        }

        /* Lightbox */
        .lightbox {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.88);
          padding: 1rem;
        }
        .lightbox-inner {
          position: relative;
          max-height: 90vh;
          max-width: 90vw;
        }
        .lightbox-close {
          position: absolute;
          top: -14px;
          right: -14px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--void-mid);
          border: 1px solid var(--crimson-dim);
          color: var(--ivory);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .lightbox-close:hover {
          background: var(--crimson);
          border-color: var(--crimson-bright);
        }
        .lightbox-img,
        .lightbox-video {
          max-height: 85vh;
          max-width: 85vw;
          object-fit: contain;
          border: var(--rule-thin);
        }
        .lightbox-caption {
          margin-top: 0.5rem;
          text-align: center;
          font-family: var(--font-body);
          font-size: 0.875rem;
          font-style: italic;
          color: var(--ivory-muted);
        }
      `}</style>

      <div className="scene-panel">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />

        <div className="media-container">
          {media.type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt={media.caption ?? 'Scene image'} className="scene-img" />
          ) : (
            <video src={media.url} controls className="scene-video" />
          )}
          <span className="source-label">
            {media.source === 'ai_generated' ? 'AI Generated' : 'Campaign Asset'}
          </span>
          <div className="controls">
            <button className="ctrl-btn" onClick={() => setExpanded(true)} aria-label="Expand" type="button">
              <Maximize2 size={14} />
            </button>
            <button className="ctrl-btn close" onClick={onClose} aria-label="Close scene" type="button">
              <X size={14} />
            </button>
          </div>
        </div>

        {media.caption && (
          <div className="caption">
            <ImageIcon size={12} color="var(--gold-dim)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <p className="caption-text">{media.caption}</p>
          </div>
        )}
      </div>

      {expanded && (
        <div className="lightbox" onClick={() => setExpanded(false)}>
          <div className="lightbox-inner" onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setExpanded(false)}
              aria-label="Close fullscreen"
              type="button"
            >
              <X size={14} />
            </button>
            {media.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.url} alt={media.caption ?? 'Scene image'} className="lightbox-img" />
            ) : (
              <video src={media.url} controls autoPlay className="lightbox-video" />
            )}
            {media.caption && <p className="lightbox-caption">{media.caption}</p>}
          </div>
        </div>
      )}
    </>
  );
}
