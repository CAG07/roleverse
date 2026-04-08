'use client';

import { useRouter } from 'next/navigation';
import { getGameSystem } from '@/lib/game-systems/registry';
import type { CampaignData } from '@/components/campaign/CampaignCard';
import styles from './DashboardPage.module.css';

function formatSystemBadge(gameSystem: string): string {
  const system = getGameSystem(gameSystem);
  if (system) return system.name;
  return gameSystem.replace(/[_-]/g, ' ');
}

export interface SessionSummary {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface CharacterSummary {
  id: string;
  name: string;
  class: string | null;
  level: number | null;
  campaign_id: string;
  campaign_name: string | null;
}

interface DashboardStats {
  campaigns: number;
  sessions: number;
  characters: number;
}

interface DashboardPageProps {
  userName: string;
  stats: DashboardStats;
  recentCampaigns: CampaignData[];
  recentSessions: SessionSummary[];
  recentCharacters: CharacterSummary[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DashboardPage({
  userName,
  stats,
  recentCampaigns,
  recentSessions,
  recentCharacters,
}: DashboardPageProps) {
  const router = useRouter();

  return (
    <div className={styles.dashboardRoot}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Welcome back, {userName.split(' ')[0]}</h1>
          <p className={styles.pageSubtitle}>Here&apos;s what&apos;s happening in your realm</p>
        </div>
        <button className={styles.btnNew} onClick={() => router.push('/campaigns/new')}>
          + New Campaign
        </button>
      </div>

      {/* Stat tiles */}
      <div className={styles.statGrid}>
        <div className={styles.statTile}>
          <span className={styles.statValue}>{stats.campaigns}</span>
          <span className={styles.statLabel}>Campaigns</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statValue}>{stats.sessions}</span>
          <span className={styles.statLabel}>Sessions</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statValue}>{stats.characters}</span>
          <span className={styles.statLabel}>Characters</span>
        </div>
      </div>

      {/* Recent Campaigns */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>
            <span className={styles.sectionLabelText}>Recent Campaigns</span>
            <span className={styles.sectionLabelLine} />
          </div>
          <button className={styles.sectionLink} onClick={() => router.push('/campaigns')}>
            View all →
          </button>
        </div>
        {recentCampaigns.length > 0 ? (
          <div className={styles.campaignGrid}>
            {recentCampaigns.map((campaign) => (
              <div
                key={campaign.id}
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
                  <span className={styles.cardSystemBadge}>{formatSystemBadge(campaign.game_system)}</span>
                </div>
                <h2 className={styles.cardName}>{campaign.name}</h2>
                <p className={styles.cardDescription}>{campaign.description || 'No description yet.'}</p>
                <span className={styles.cardDate}>{formatDate(campaign.created_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyHint}>No campaigns yet. <button className={styles.inlineLink} onClick={() => router.push('/campaigns/new')}>Create one →</button></p>
        )}
      </section>

      {/* Recent Sessions */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>
            <span className={styles.sectionLabelText}>Recent Sessions</span>
            <span className={styles.sectionLabelLine} />
          </div>
        </div>
        {recentSessions.length > 0 ? (
          <div className={styles.listStack}>
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className={styles.listRow}
                onClick={() => router.push(`/campaigns/${session.campaign_id}/session`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === 'Enter' && router.push(`/campaigns/${session.campaign_id}/session`)
                }
              >
                <div className={styles.listRowMain}>
                  <span className={styles.listRowTitle}>{session.campaign_name ?? 'Unknown Campaign'}</span>
                  <span className={styles.listRowMeta}>{formatDate(session.started_at)}</span>
                </div>
                <span className={styles.listRowBadge}>{session.ended_at ? 'Completed' : 'In Progress'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyHint}>No sessions recorded yet.</p>
        )}
      </section>

      {/* Recent Characters */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>
            <span className={styles.sectionLabelText}>Recent Characters</span>
            <span className={styles.sectionLabelLine} />
          </div>
        </div>
        {recentCharacters.length > 0 ? (
          <div className={styles.listStack}>
            {recentCharacters.map((char) => (
              <div
                key={char.id}
                className={styles.listRow}
                onClick={() => router.push(`/campaigns/${char.campaign_id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && router.push(`/campaigns/${char.campaign_id}`)}
              >
                <div className={styles.listRowMain}>
                  <span className={styles.listRowTitle}>{char.name}</span>
                  <span className={styles.listRowMeta}>
                    {[char.class, char.level != null ? `Lv ${char.level}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                    {char.campaign_name ? ` — ${char.campaign_name}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyHint}>No characters found yet.</p>
        )}
      </section>
    </div>
  );
}
