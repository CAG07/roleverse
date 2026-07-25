'use client';

import styles from './PF2ESheet.module.css';
import BaseSheet from './BaseSheet';
import schema from '@/lib/character/sheet-schema/pf2e';

interface PF2ESheetProps {
  characterId: string;
  data: Record<string, unknown>;
  equipment?: unknown[];
}

const FIXED_ACTIONS = 3;

const RANK_LABELS: Record<string, string> = {
  '0': 'Untrained',
  '1': 'Trained',
  '2': 'Expert',
  '3': 'Master',
  '4': 'Legendary',
};

const RANK_CSS: Record<string, string> = {
  '0': styles.untrained,
  '1': styles.trained,
  '2': styles.expert,
  '3': styles.master,
  '4': styles.legendary,
};

export default function PF2ESheet({ characterId, data, equipment = [] }: PF2ESheetProps) {
  const race = (data.race as string) ?? '—';
  const characterClass = (data.class as string) ?? '—';
  const level = (data.level as number) ?? 0;
  const ancestry = (data.ancestry as string) ?? '';
  const background = (data.background as string) ?? '';
  const proficiencyRanks = (data.proficiencyRanks as Record<string, unknown> | undefined) ?? {};

  const metaParts = [ancestry || race, characterClass, background].filter(Boolean);

  return (
    <BaseSheet
      characterId={characterId}
      gameSystem="PATHFINDER_2E"
      schema={schema}
      data={data}
      equipment={equipment}
      showAbilityModifiers
      metaLines={[`${metaParts.join(' · ')} · Level ${level}`]}
      hiddenFieldKeys={['proficiencyRanks']}
      extra={
        <>
          <div>
            <div className={styles.sectionLabel}>Actions per Turn</div>
            <div className={styles.actionsRow}>
              {Array.from({ length: FIXED_ACTIONS }).map((_, i) => (
                <div key={i} className={styles.actionPip}>
                  ◆
                </div>
              ))}
            </div>
          </div>

          {Object.keys(proficiencyRanks).length > 0 && (
            <div>
              <div className={styles.sectionLabel}>Proficiency Ranks</div>
              <div className={styles.profRanks}>
                {Object.entries(proficiencyRanks).map(([key, rank]) => {
                  const rankStr = String(rank);
                  return (
                    <div key={key} className={styles.profRankRow}>
                      <span className={styles.profRankName}>{key}</span>
                      <span className={`${styles.profRankBadge} ${RANK_CSS[rankStr] ?? styles.untrained}`}>
                        {RANK_LABELS[rankStr] ?? 'Untrained'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      }
    />
  );
}
