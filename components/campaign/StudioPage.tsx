'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listCampaignScenes, type SceneAsset } from '@/lib/campaigns/scene-assets';
import type { StudioVideo } from '@/lib/campaigns/studio-media';
import styles from './StudioPage.module.css';

interface StudioCharacter {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface StudioPageProps {
  campaignId: string;
  campaignName: string;
  coverImageUrl: string | null;
  characters: StudioCharacter[];
  videos: StudioVideo[];
}

interface ImageTile {
  key: string;
  url: string;
  label: string;
  sourceTag: string;
}

type StudioTab = 'images' | 'videos';

export function StudioPage({ campaignId, campaignName, coverImageUrl, characters, videos }: StudioPageProps) {
  const [tab, setTab] = useState<StudioTab>('images');
  const [sceneAssets, setSceneAssets] = useState<SceneAsset[]>([]);
  const [loadingScenes, setLoadingScenes] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<ImageTile | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await listCampaignScenes(campaignId);
      if (!cancelled) {
        setSceneAssets(result.assets);
        setLoadingScenes(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  useEffect(() => {
    if (!lightboxImage) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxImage(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxImage]);

  const images: ImageTile[] = [
    ...sceneAssets.map((a) => ({
      key: `scene-${a.name}`,
      url: a.url,
      label: a.displayName,
      sourceTag: 'Scene Library',
    })),
    ...(coverImageUrl
      ? [{ key: 'cover', url: coverImageUrl, label: campaignName, sourceTag: 'Cover' }]
      : []),
    ...characters
      .filter((c) => c.avatar_url)
      .map((c) => ({
        key: `avatar-${c.id}`,
        url: c.avatar_url as string,
        label: c.name,
        sourceTag: 'Character',
      })),
  ];

  return (
    <div className={styles.root}>
      <div className={styles.layout}>
        <nav className={styles.sideNav}>
          <Link href="/dashboard" className={styles.backLink}>
            ← Back to Dashboard
          </Link>
          <span className={styles.navHeading}>Studio</span>
          <span className={styles.navSubheading}>{campaignName}</span>
          <button
            type="button"
            className={`${styles.navItem} ${tab === 'images' ? styles.navItemActive : ''}`}
            onClick={() => setTab('images')}
          >
            Images
            <span className={styles.navCount}>{images.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${tab === 'videos' ? styles.navItemActive : ''}`}
            onClick={() => setTab('videos')}
          >
            Videos
            <span className={styles.navCount}>{videos.length}</span>
          </button>
        </nav>

        <div className={styles.content}>
          {tab === 'images' ? (
            loadingScenes ? (
              <p className={styles.placeholder}>Loading…</p>
            ) : images.length === 0 ? (
              <p className={styles.placeholder}>
                No images yet — upload one to the Scene Library, set a cover image, or give a
                character an avatar and it&apos;ll show up here automatically.
              </p>
            ) : (
              <div className={styles.imageGrid}>
                {images.map((img) => (
                  <div
                    key={img.key}
                    className={styles.imageTile}
                    onClick={() => setLightboxImage(img)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setLightboxImage(img);
                      }
                    }}
                    aria-label={`View ${img.label} full size`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.label} className={styles.imageThumb} />
                    <div className={styles.imageMeta}>
                      <span className={styles.imageLabel}>{img.label}</span>
                      <span className={styles.imageSource}>{img.sourceTag}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : videos.length === 0 ? (
            <p className={styles.placeholder}>
              No videos yet — a YouTube link written into an uploaded document (house rules,
              module notes) will show up here once indexed.
            </p>
          ) : (
            <div className={styles.videoGrid}>
              {videos.map((v) => (
                <div key={v.videoId} className={styles.videoTile}>
                  <div className={styles.videoEmbedWrap}>
                    <iframe
                      className={styles.videoEmbed}
                      src={`https://www.youtube.com/embed/${v.videoId}`}
                      title={v.source ?? v.videoId}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  {v.source && <span className={styles.videoSource}>{v.source}</span>}
                  <a
                    href={`https://www.youtube.com/watch?v=${v.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.videoUrl}
                  >
                    {`https://www.youtube.com/watch?v=${v.videoId}`}
                  </a>
                  {v.snippet && <p className={styles.videoSnippet}>{v.snippet}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {lightboxImage && (
        <div
          className={styles.lightboxOverlay}
          role="presentation"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className={styles.lightboxDialog}
            role="dialog"
            aria-modal="true"
            aria-label={lightboxImage.label}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={() => setLightboxImage(null)}
              aria-label="Close"
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxImage.url} alt={lightboxImage.label} className={styles.lightboxImg} />
            <div className={styles.lightboxCaption}>
              <span className={styles.imageLabel}>{lightboxImage.label}</span>
              <span className={styles.imageSource}>{lightboxImage.sourceTag}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
