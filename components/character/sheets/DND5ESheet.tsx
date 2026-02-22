'use client';

import styles from './DND5ESheet.module.css';

interface DND5ESheetProps {
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

export default function DND5ESheet({ data }: DND5ESheetProps) {
  const name = getVal(data, 'name', 'Unknown');
  const race = getVal(data, 'race', '—');
  const characterClass = getVal(data, 'class', '—');
  const subclass = getVal(data, 'subclass', '');
  const level = getVal(data, 'level', 0);
  const background = getVal(data, 'background', '—');
  const alignment = getVal(data, 'alignment', '—');
  const proficiencyBonus = getVal(data, 'proficiencyBonus', 2);
  const ac = getVal(data, 'ac', 10);
  const hp = getVal(data, 'hp', 0);
  const maxHp = getVal(data, 'maxHp', 0);
  const hitDice = getVal(data, 'hitDice', '—');

  const abilityScores = getRecord(data, 'abilityScores');
  const savingThrowProf = getVal<string[]>(data, 'savingThrowProficiencies', []);
  const skillProf = getVal<string[]>(data, 'skillProficiencies', []);
  const features = getVal<string[]>(data, 'features', []);

  const spellSaveDC = getVal<number | null>(data, 'spellSaveDC', null);
  const spellAttackMod = getVal<number | null>(data, 'spellAttackModifier', null);
  const spellSlots = getVal<Record<string, number>>(data, 'spellSlots', {});

  const statLabels = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const statKeys = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

  return (
    <div className={styles.sheetRoot}>
      <div className={styles.sheetHeader}>
        <h3 className={styles.sheetName}>{name}</h3>
        <p className={styles.sheetMeta}>
          {race} {characterClass}{subclass ? ` (${subclass})` : ''} · Level {level}
        </p>
        <p className={styles.sheetMeta}>{background} · {alignment}</p>
      </div>

      <div>
        <div className={styles.sectionLabel}>Ability Scores</div>
        <div className={styles.statsGrid}>
          {statLabels.map((label, i) => {
            const score = (abilityScores[statKeys[i]] as number) ?? 10;
            return (
              <div key={label} className={styles.statBox}>
                <span className={styles.statAbbr}>{label}</span>
                <span className={styles.statScore}>{score}</span>
                <span className={styles.statMod}>{abilityModifier(score)}</span>
              </div>
            );
          })}
        </div>
      </div>

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
            <span className={styles.combatLabel}>Hit Dice</span>
            <span className={`${styles.combatValue} ${styles.dice}`}>{hitDice}</span>
          </div>
          <div className={styles.combatBox}>
            <span className={styles.combatLabel}>Prof.</span>
            <span className={`${styles.combatValue} ${styles.prof}`}>+{proficiencyBonus}</span>
          </div>
        </div>
      </div>

      {savingThrowProf.length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Saving Throw Proficiencies</div>
          <p className={styles.profText}>{savingThrowProf.join(', ')}</p>
        </div>
      )}

      {skillProf.length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Skill Proficiencies</div>
          <p className={styles.profText}>{skillProf.join(', ')}</p>
        </div>
      )}

      {spellSaveDC !== null && (
        <div>
          <div className={styles.sectionLabel}>Spellcasting</div>
          <div className={styles.spellInfo}>
            <span>Save DC: {spellSaveDC}</span>
            {spellAttackMod !== null && <span>Attack: +{spellAttackMod}</span>}
          </div>
          {Object.keys(spellSlots).length > 0 && (
            <div className={styles.spellSlots}>
              {Object.entries(spellSlots).map(([lvl, count]) => (
                <span key={lvl} className={styles.spellSlot}>Lv{lvl}: {count}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {features.length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Features &amp; Traits</div>
          <ul className={styles.featuresList}>
            {features.map((f) => (
              <li key={f} className={styles.featureItem}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
