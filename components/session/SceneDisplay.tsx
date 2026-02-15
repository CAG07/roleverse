'use client';

import { useState } from 'react';
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
      {/* Scene Panel */}
      <div className="relative flex flex-col overflow-hidden rounded border-2 border-gold bg-brown-dark">
        {/* Ornate frame effect via CSS */}
        <div className="absolute inset-0 pointer-events-none rounded border-4 border-double border-gold/30" />

        {/* Media container — 16:9 aspect ratio, max ~35vh */}
        <div className="relative aspect-video max-h-[35vh] w-full overflow-hidden bg-black">
          {media.type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.url}
              alt={media.caption ?? 'Scene image'}
              className="h-full w-full object-contain"
            />
          ) : (
            <video
              src={media.url}
              controls
              className="h-full w-full object-contain"
            />
          )}

          {/* Source label */}
          <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-cream/70">
            {media.source === 'ai_generated' ? 'AI Generated' : 'Campaign Asset'}
          </span>

          {/* Controls */}
          <div className="absolute right-2 top-2 flex gap-1">
            <button
              onClick={() => setExpanded(true)}
              className="rounded bg-black/60 p-1 text-cream/70 hover:text-gold"
              aria-label="Expand"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded bg-black/60 p-1 text-cream/70 hover:text-rust"
              aria-label="Close scene"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Caption */}
        {media.caption && (
          <div className="flex items-start gap-2 bg-brown-dark/90 px-3 py-2">
            <ImageIcon className="mt-0.5 h-3 w-3 shrink-0 text-gold/60" />
            <p className="text-xs italic text-cream/70">{media.caption}</p>
          </div>
        )}
      </div>

      {/* Lightbox overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExpanded(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <button
              onClick={() => setExpanded(false)}
              className="absolute -right-3 -top-3 rounded-full bg-brown p-1 text-cream hover:text-gold"
              aria-label="Close fullscreen"
            >
              <X className="h-5 w-5" />
            </button>
            {media.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media.url}
                alt={media.caption ?? 'Scene image'}
                className="max-h-[85vh] max-w-[85vw] rounded border-2 border-gold object-contain"
              />
            ) : (
              <video
                src={media.url}
                controls
                autoPlay
                className="max-h-[85vh] max-w-[85vw] rounded border-2 border-gold"
              />
            )}
            {media.caption && (
              <p className="mt-2 text-center text-sm italic text-cream/80">{media.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
