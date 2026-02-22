'use client';

import styles from './CampaignCard.module.css';
import { useRouter } from 'next/navigation';
import { getGameSystem } from '@/lib/game-systems/registry';

export interface CampaignData {
  id: string;
  name: string;
  description: string | null;
  game_system: string;
  created_at: string;
}

function formatSystemBadge(gameSystem: string): string {
  const system = getGameSystem(gameSystem);
  if (system) return system.name;
  // Fallback: replace underscores/hyphens with spaces for display
  return gameSystem.replace(/[_-]/g, ' ');
}

export function CampaignCard({ campaign }: { campaign: CampaignData }) {
  const router = useRouter();

  const formattedDate = new Date(campaign.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={styles.campaignCard}
      onClick={() => router.push(`/campaigns/${campaign.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/campaigns/${campaign.id}`)}
    >
      <span className={`${styles.corner} ${styles.tl}`} />
      <span className={`${styles.corner} ${styles.tr}`} />
      <span className={`${styles.corner} ${styles.bl}`} />
      <span className={`${styles.corner} ${styles.br}`} />

      <div className={styles.cardHeader}>
        <span className={styles.systemBadge}>{formatSystemBadge(campaign.game_system)}</span>
      </div>
      <h2 className={styles.cardName}>{campaign.name}</h2>
      <p className={styles.cardDesc}>{campaign.description || 'No description yet.'}</p>
      <span className={styles.cardDate}>{formattedDate}</span>
    </div>
  );
}
