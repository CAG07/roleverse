'use client';

import styles from './CharacterHeaderBanner.module.css';
import { getGameSystem } from '@/lib/game-systems/registry';

interface CharacterHeaderBannerProps {
  name: string;
  gameSystem: string;
  metaParts?: (string | null | undefined)[];
  hp?: number | null;
  maxHp?: number | null;
}

/** Name / system badge / meta line / HP bar block shared by the campaign-screen
 *  character page and the session popout sheet, so the two stay visually in sync
 *  instead of drifting as two hand-maintained copies. */
export default function CharacterHeaderBanner({
  name,
  gameSystem,
  metaParts = [],
  hp,
  maxHp,
}: CharacterHeaderBannerProps) {
  const meta = metaParts.filter(Boolean) as string[];
  const hpPct = hp != null && maxHp != null && maxHp > 0 ? Math.min(100, Math.max(0, (hp / maxHp) * 100)) : 0;

  return (
    <div className={styles.headerCard}>
      <span className={`${styles.corner} ${styles.tl}`} />
      <span className={`${styles.corner} ${styles.tr}`} />
      <span className={`${styles.corner} ${styles.bl}`} />
      <span className={`${styles.corner} ${styles.br}`} />

      <div className={styles.headerTop}>
        <h1 className={styles.charName}>{name}</h1>
        <span className={styles.systemBadge}>{getGameSystem(gameSystem)?.name ?? gameSystem}</span>
      </div>

      {meta.length > 0 && <p className={styles.charMeta}>{meta.join(' · ')}</p>}

      {hp != null && maxHp != null && (
        <div className={styles.hpSection}>
          <div className={styles.hpLabel}>
            <span>HP</span>
            <span className={styles.hpNumbers}>
              {hp} / {maxHp}
            </span>
          </div>
          <div className={styles.hpTrack}>
            <div className={styles.hpFill} style={{ width: `${hpPct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
