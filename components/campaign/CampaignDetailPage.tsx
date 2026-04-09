'use client';

import styles from './CampaignDetailPage.module.css';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export interface CampaignCharacter {
  id: string;
  name: string;
  class: string | null;
  race: string | null;
  level: number | null;
  hp: number | null;
  max_hp: number | null;
}

export interface CampaignSession {
  id: string;
  started_at: string;
  ended_at: string | null;
}

interface CampaignDetailPageProps {
  id: string;
  name: string;
  description: string | null;
  systemName: string;
  systemDescription: string;
  characters: CampaignCharacter[];
  sessions: CampaignSession[];
  sessionCount: number;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatSessionDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return 'Active';
  const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function CampaignDetailPage({
  id,
  name,
  description,
  systemName,
  systemDescription,
  characters,
  sessions,
  sessionCount,
}: CampaignDetailPageProps) {
  const router = useRouter();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const lastSession = sessions[0] ?? null;

  const handleDelete = async () => {
    if (!window.confirm(`Delete campaign "${name}"? This cannot be undone.`)) return;
    setDeleteError(null);
    const supabase = createClient();
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) {
      setDeleteError(error.message);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className={styles.campaignDetailRoot}>
      <Link href="/dashboard" className={styles.backLink}>
        ← Back to Dashboard
      </Link>

      <div className={styles.campaignHeader}>
        <div className={styles.campaignTitleRow}>
          <h1 className={styles.campaignTitle}>{name}</h1>
          <span className={styles.systemBadge}>{systemName}</span>
        </div>
        {description && <p className={styles.campaignDescription}>{description}</p>}
        {systemDescription && <p className={styles.campaignSystemInfo}>{systemDescription}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href={`/campaigns/${id}/session`} className={styles.btnStartSession}>
            ▶ Start Session
          </Link>
          <Link href={`/campaigns/${id}/edit`} className={styles.btnEdit}>
            ✎ Edit Campaign
          </Link>
          <button type="button" className={styles.btnDelete} onClick={handleDelete}>
            ✕ Delete Campaign
          </button>
        </div>
        {deleteError && <p className={styles.deleteError}>{deleteError}</p>}
      </div>

      {/* Stats strip */}
      <div className={styles.statsStrip}>
        <div className={styles.statBlock}>
          <span className={`${styles.statCorner} ${styles.tl}`} />
          <span className={`${styles.statCorner} ${styles.tr}`} />
          <span className={`${styles.statCorner} ${styles.bl}`} />
          <span className={`${styles.statCorner} ${styles.br}`} />
          <span className={styles.statValue}>{characters.length}</span>
          <span className={styles.statLabel}>Characters</span>
        </div>
        <div className={styles.statBlock}>
          <span className={`${styles.statCorner} ${styles.tl}`} />
          <span className={`${styles.statCorner} ${styles.tr}`} />
          <span className={`${styles.statCorner} ${styles.bl}`} />
          <span className={`${styles.statCorner} ${styles.br}`} />
          <span className={styles.statValue}>{sessionCount}</span>
          <span className={styles.statLabel}>Sessions</span>
        </div>
        <div className={styles.statBlock}>
          <span className={`${styles.statCorner} ${styles.tl}`} />
          <span className={`${styles.statCorner} ${styles.tr}`} />
          <span className={`${styles.statCorner} ${styles.bl}`} />
          <span className={`${styles.statCorner} ${styles.br}`} />
          <span className={styles.statValue}>
            {lastSession ? formatRelativeTime(lastSession.started_at) : 'Never'}
          </span>
          <span className={styles.statLabel}>Last Played</span>
        </div>
      </div>

      <div className={styles.sectionLabel}>
        <span className={styles.sectionLabelText}>Campaign Actions</span>
        <span className={styles.sectionLabelLine} />
      </div>

      <div className={styles.actionGrid}>
        <Link href={`/campaigns/${id}/characters`} className={styles.actionCard}>
          <h3 className={styles.actionCardTitle}>Characters</h3>
          <p className={styles.actionCardBody}>View and manage party characters.</p>
        </Link>
      </div>

      <div className={styles.sectionLabel}>
        <span className={styles.sectionLabelText}>Campaign Info</span>
        <span className={styles.sectionLabelLine} />
      </div>

      <div className={styles.infoGrid}>
        {/* Party Members */}
        <div className={styles.infoPanel}>
          <h3 className={styles.infoPanelTitle}>Party Members</h3>
          {characters.length > 0 ? (
            <div className={styles.characterList}>
              {characters.map((char) => (
                <div key={char.id} className={styles.characterCard}>
                  <div className={styles.characterName}>{char.name}</div>
                  <div className={styles.characterMeta}>
                    {[char.race, char.class].filter(Boolean).join(' ')}
                    {char.level != null ? ` · Lv ${char.level}` : ''}
                  </div>
                  {char.hp != null && char.max_hp != null && (
                    <div className={styles.characterHp}>
                      {char.hp} / {char.max_hp} HP
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>No characters yet. Create one to begin.</p>
              <Link href={`/campaigns/${id}/characters/new`} className={styles.btnEmptyAction}>
                + Create Character
              </Link>
            </div>
          )}
        </div>

        {/* Session History */}
        <div className={styles.infoPanel}>
          <h3 className={styles.infoPanelTitle}>Session History</h3>
          {sessions.length > 0 ? (
            <div className={styles.sessionList}>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={styles.sessionRow}
                  onClick={() => router.push(`/campaigns/${id}/session`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    (e.key === 'Enter' || e.key === ' ') && router.push(`/campaigns/${id}/session`)
                  }
                >
                  <span className={styles.sessionDate}>
                    {new Date(session.started_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className={styles.sessionDuration}>
                    {formatSessionDuration(session.started_at, session.ended_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.infoPanelPlaceholder}>
              No sessions yet. Click Start Session above to begin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

