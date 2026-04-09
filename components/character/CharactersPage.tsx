'use client';

import styles from './CharactersPage.module.css';
import Link from 'next/link';

export interface CharacterSummary {
  id: string;
  name: string;
  class: string | null;
  race: string | null;
  level: number | null;
  hp: number | null;
  max_hp: number | null;
  game_system: string;
  updated_at: string;
}

interface CharactersPageProps {
  campaignId: string;
  campaignName: string;
  characters: CharacterSummary[];
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

export function CharactersPage({ campaignId, campaignName, characters }: CharactersPageProps) {
  return (
    <div className={styles.root}>
      <Link href={`/campaigns/${campaignId}`} className={styles.backLink}>
        ← Back to {campaignName}
      </Link>

      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Characters</h1>
          <Link href={`/campaigns/${campaignId}/characters/new`} className={styles.btnNew}>
            + New Character
          </Link>
        </div>
        <p className={styles.subtitle}>{campaignName}</p>
      </div>

      <div className={styles.sectionLabel}>
        <span className={styles.sectionLabelText}>Party</span>
        <span className={styles.sectionLabelLine} />
      </div>

      {characters.length > 0 ? (
        <div className={styles.characterGrid}>
          {characters.map((char) => (
            <div key={char.id} className={styles.characterCard}>
              <div className={styles.cardTop}>
                <span className={styles.characterName}>{char.name}</span>
                <span className={styles.systemBadge}>{char.game_system}</span>
              </div>
              {([char.race, char.class].some(Boolean) || char.level != null) && (
                <div className={styles.characterMeta}>
                  {[char.race, char.class].filter(Boolean).join(' ')}
                  {char.level != null ? ` · Lv ${char.level}` : ''}
                </div>
              )}
              {char.hp != null && char.max_hp != null && (
                <div className={styles.characterHp}>
                  {char.hp} / {char.max_hp} HP
                </div>
              )}
              <div className={styles.characterUpdated}>
                Updated {formatRelativeTime(char.updated_at)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            No characters yet. Create one to begin your adventure.
          </p>
          <Link href={`/campaigns/${campaignId}/characters/new`} className={styles.btnEmptyAction}>
            + Create Character
          </Link>
        </div>
      )}
    </div>
  );
}
