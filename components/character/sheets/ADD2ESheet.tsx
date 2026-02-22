'use client';

import styles from './ADD2ESheet.module.css';

interface ADD2ESheetProps {
  data: Record<string, unknown>;
}

function getVal<T>(data: Record<string, unknown>, key: string, fallback: T): T {
  return (data[key] as T) ?? fallback;
}

function getRecord(data: Record<string, unknown>, key: string): Record<string, unknown> {
  return (data[key] as Record<string, unknown>) ?? {};
}

export default function ADD2ESheet({ data }: ADD2ESheetProps) {
  const name = getVal(data, 'name', 'Unknown');
  const race = getVal(data, 'race', '—');
  const characterClass = getVal(data, 'class', '—');
  const level = getVal(data, 'level', 0);
  const alignment = getVal(data, 'alignment', '—');
  const thac0 = getVal(data, 'thac0', 20);
  const ac = getVal(data, 'ac', 10);
  const hp = getVal(data, 'hp', 0);
  const maxHp = getVal(data, 'maxHp', 0);

  const abilityScores = getRecord(data, 'abilityScores');
  const savingThrows = getRecord(data, 'savingThrows');
  const weaponProf = getVal<string[]>(data, 'weaponProficiencies', []);
  const nonWeaponProf = getVal<string[]>(data, 'nonWeaponProficiencies', []);
  const spellSlots = getVal<Record<string, number>>(data, 'spellSlots', {});

  const statLabels = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const statKeys = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

  const saveLabels: Record<string, string> = {
    paralyzation: 'Para/Poison/Death',
    rod: 'Rod/Staff/Wand',
    petrification: 'Petrif./Polymorph',
    breath: 'Breath Weapon',
    spell: 'Spell',
  };

  return (
    <div className={styles.sheetRoot}>
      {/* Header */}
      <div className={styles.sheetHeader}>
        <h3 className={styles.sheetName}>{name}</h3>
        <p className={styles.sheetMeta}>
          {race} {characterClass} · Level {level} · {alignment}
        </p>
      </div>

      {/* Stats */}
      <div>
        <div className={styles.sectionLabel}>Ability Scores</div>
        <div className={styles.statsGrid}>
          {statLabels.map((label, i) => (
            <div key={label} className={styles.statBox}>
              <span className={styles.statLabel}>{label}</span>
              <span className={styles.statValue}>{(abilityScores[statKeys[i]] as number) ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Combat */}
      <div>
        <div className={styles.sectionLabel}>Combat</div>
        <div className={styles.combatGrid}>
          <div className={styles.combatBox}>
            <span className={styles.combatLabel}>THAC0</span>
            <span className={`${styles.combatValue} ${styles.thac0}`}>{thac0}</span>
          </div>
          <div className={styles.combatBox}>
            <span className={styles.combatLabel}>AC</span>
            <span className={`${styles.combatValue} ${styles.ac}`}>{ac}</span>
          </div>
          <div className={styles.combatBox}>
            <span className={styles.combatLabel}>HP</span>
            <span className={`${styles.combatValue} ${styles.hp}`}>{hp}/{maxHp}</span>
          </div>
        </div>
      </div>

      {/* Saving Throws */}
      {Object.keys(savingThrows).length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Saving Throws</div>
          {Object.entries(saveLabels).map(([key, label]) => (
            <div key={key} className={styles.saveRow}>
              <span className={styles.saveName}>{label}</span>
              <span className={styles.saveVal}>{(savingThrows[key] as number) ?? '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Proficiencies */}
      {weaponProf.length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Weapon Proficiencies</div>
          <p className={styles.profText}>{weaponProf.join(', ')}</p>
        </div>
      )}
      {nonWeaponProf.length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Non-Weapon Proficiencies</div>
          <p className={styles.profText}>{nonWeaponProf.join(', ')}</p>
        </div>
      )}

      {/* Spell Slots */}
      {Object.keys(spellSlots).length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Spell Slots</div>
          <div className={styles.spellSlots}>
            {Object.entries(spellSlots).map(([lvl, count]) => (
              <span key={lvl} className={styles.spellSlot}>Lv{lvl}: {count}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
