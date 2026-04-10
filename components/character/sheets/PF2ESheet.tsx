'use client';

import styles from './PF2ESheet.module.css';

interface PF2ESheetProps {
  data: Record<string, unknown>;
}

function getVal<T>(data: Record<string, unknown>, key: string, fallback: T): T {
  return (data[key] as T) ?? fallback;
}

function getRecord(data: Record<string, unknown>, key: string): Record<string, unknown> {
  return (data[key] as Record<string, unknown>) ?? {};
}

function abilityModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

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

export default function PF2ESheet({ data }: PF2ESheetProps) {
  const name = getVal(data, 'name', 'Unknown');
  const race = getVal(data, 'race', '—');
  const characterClass = getVal(data, 'class', '—');
  const level = getVal(data, 'level', 0);
  const ancestry = getVal(data, 'ancestry', '');
  const background = getVal(data, 'background', '');
  const ac = getVal(data, 'ac', 10);
  const hp = getVal(data, 'hp', 0);
  const maxHp = getVal(data, 'maxHp', 0);
  const perception = getVal(data, 'perception', 0);
  const actions = getVal(data, 'actions', 3);

  const abilityScores = getRecord(data, 'abilityScores');
  const proficiencyRanks = getRecord(data, 'proficiencyRanks');
  const savingThrows = getRecord(data, 'savingThrows');
  const skills = getRecord(data, 'skills');
  const feats = getVal<string[]>(data, 'feats', []);

  const statLabels = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const statKeys = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

  const metaParts = [ancestry || race, characterClass, background].filter(Boolean);

  const saveLabelMap: Record<string, string> = {
    fortitude: 'Fortitude',
    reflex: 'Reflex',
    will: 'Will',
  };

  return (
    <div className={styles.sheetRoot}>
      {/* Header */}
      <div className={styles.sheetHeader}>
        <h3 className={styles.sheetName}>{name}</h3>
        <p className={styles.sheetMeta}>
          {metaParts.join(' · ')} · Level {level}
        </p>
      </div>

      {/* Ability Scores */}
      <div>
        <div className={styles.sectionLabel}>Ability Scores</div>
        <div className={styles.statsGrid}>
          {statLabels.map((label, i) => {
            const score = (abilityScores[statKeys[i]] as number) ?? 10;
            return (
              <div key={label} className={styles.statBox}>
                <span className={styles.statLabel}>{label}</span>
                <span className={styles.statValue}>{score}</span>
                <span className={styles.statMod}>{abilityModifier(score)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Combat */}
      <div>
        <div className={styles.sectionLabel}>Combat</div>
        <div className={styles.combatGrid}>
          <div className={styles.combatBox}>
            <span className={styles.combatLabel}>AC</span>
            <span className={`${styles.combatValue} ${styles.ac}`}>{ac}</span>
          </div>
          <div className={styles.combatBox}>
            <span className={styles.combatLabel}>HP</span>
            <span className={`${styles.combatValue} ${styles.hp}`}>{hp}/{maxHp}</span>
          </div>
          <div className={styles.combatBox}>
            <span className={styles.combatLabel}>Perception</span>
            <span className={`${styles.combatValue} ${styles.perception}`}>
              {perception >= 0 ? `+${perception}` : perception}
            </span>
          </div>
        </div>
      </div>

      {/* Three-Action Economy */}
      <div>
        <div className={styles.sectionLabel}>Actions per Turn</div>
        <div className={styles.actionsRow}>
          {Array.from({ length: actions as number }).map((_, i) => (
            <div key={i} className={styles.actionPip}>
              ◆
            </div>
          ))}
        </div>
      </div>

      {/* Saving Throws */}
      {Object.keys(savingThrows).length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Saving Throws</div>
          <div className={styles.profRanks}>
            {Object.entries(saveLabelMap).map(([key, label]) => {
              const val = savingThrows[key];
              if (val === undefined) return null;
              return (
                <div key={key} className={styles.profRankRow}>
                  <span className={styles.profRankName}>{label}</span>
                  <span className={styles.profRankName}>
                    {(val as number) >= 0 ? `+${String(val)}` : String(val)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Proficiency Ranks */}
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

      {/* Skills */}
      {Object.keys(skills).length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Skills</div>
          <div className={styles.profRanks}>
            {Object.entries(skills).map(([skill, modifier]) => (
              <div key={skill} className={styles.profRankRow}>
                <span className={styles.profRankName}>{skill}</span>
                <span className={styles.profRankName}>
                  {(modifier as number) >= 0 ? `+${String(modifier)}` : String(modifier)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feats */}
      {feats.length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Feats &amp; Abilities</div>
          <p className={styles.profText}>{feats.join(', ')}</p>
        </div>
      )}
    </div>
  );
}
