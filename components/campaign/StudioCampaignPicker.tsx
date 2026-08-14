'use client';

import Link from 'next/link';
import styles from './StudioCampaignPicker.module.css';

interface PickerCampaign {
  id: string;
  name: string;
  cover_image_url: string | null;
}

interface StudioCampaignPickerProps {
  campaigns: PickerCampaign[];
}

export function StudioCampaignPicker({ campaigns }: StudioCampaignPickerProps) {
  return (
    <div className={styles.root}>
      <h1 className={styles.pageTitle}>Studio</h1>
      <p className={styles.pageSubtitle}>
        Pick a campaign to browse its images and videos.
      </p>

      {campaigns.length === 0 ? (
        <p className={styles.emptyText}>
          No campaigns yet — create one first from the Campaigns page.
        </p>
      ) : (
        <div className={styles.grid}>
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}/studio`} className={styles.card}>
              <div className={styles.thumb}>
                {c.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.cover_image_url} alt="" className={styles.thumbImg} />
                ) : (
                  <span className={styles.thumbPlaceholder}>{c.name.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <span className={styles.cardName}>{c.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
