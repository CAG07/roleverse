'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getGameSystem } from '@/lib/game-systems/registry';
import type { CampaignData } from '@/components/campaign/CampaignCard';
import styles from './DashboardPage.module.css';

function formatSystemBadge(gameSystem: string): string {
  const system = getGameSystem(gameSystem);
  if (system) return system.name;
  return gameSystem.replace(/[_-]/g, ' ');
}

interface DashboardPageProps {
  campaigns: CampaignData[];
}

export function DashboardPage({ campaigns }: DashboardPageProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.dashboardRoot}>
      {/* Topbar */}
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.pageTitle}>Your Campaigns</h1>
          <p className={styles.pageSubtitle}>Manage your tabletop RPG adventures</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search campaigns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className={styles.btnNew} onClick={() => router.push('/campaigns/new')}>
            + New Campaign
          </button>
        </div>
      </div>

      {/* Section label */}
      <div className={styles.sectionLabel}>
        <span className={styles.sectionLabelText}>Active Campaigns</span>
        <span className={styles.sectionLabelLine} />
      </div>

      {/* Campaign grid or empty state */}
      {filtered.length > 0 ? (
        <div className={styles.campaignGrid}>
          {filtered.map((campaign, i) => (
            <div
              key={campaign.id}
              className={`${styles.campaignCard} animate-fade-rise${i === 0 ? ' delay-1' : i === 1 ? ' delay-2' : i === 2 ? ' delay-3' : ' delay-4'}`}
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
                <span className={styles.cardSystemBadge}>{formatSystemBadge(campaign.game_system)}</span>
              </div>
              <h2 className={styles.cardName}>{campaign.name}</h2>
              <p className={styles.cardDescription}>{campaign.description || 'No description yet.'}</p>
              <span className={styles.cardDate}>
                {new Date(campaign.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateTitle}>No Campaigns Yet</p>
          <p className={styles.emptyStateBody}>
            Begin your first adventure by creating a new campaign. Choose your game system and
            gather your party!
          </p>
          <button className={styles.btnNew} onClick={() => router.push('/campaigns/new')}>
            + Create Your First Campaign
          </button>
        </div>
      )}
    </div>
  );
}
