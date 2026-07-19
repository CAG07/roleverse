'use client';

import styles from './DCCSheet.module.css';
import InlineNumberEditor from '../InlineNumberEditor';
import EquipmentList from '../EquipmentList';
import type { DCCMercurialSpell } from '@/lib/types/dcc-character';
import { updateCharacterHp, updateCharacterGameDataStats } from '@/lib/characters/character-updates';

interface DCCFunnelMember {
  id: string;
  name: string;
  occupation?: string;
  hp?: { current: number; max: number };
  ac?: number;
}

interface DCCSheetProps {
  characterId: string;
  data: Record<string, unknown>;
  /** Raw game_data_stats JSONB blob — needed to write back Luck without clobbering other keys. */
  rawGameDataStats?: Record<string, unknown>;
  /**
   * Optional compact roster of other level-0 funnel characters run by the same
   * player. When provided, rendered as a stacked list above the full sheet.
   */
  funnelParty?: DCCFunnelMember[];
}

function getVal<T>(data: Record<string, unknown>, key: string, fallback: T): T {
  return (data[key] as T) ?? fallback;
}

function getRecord(data: Record<string, unknown>, key: string): Record<string, unknown> {
  return (data[key] as Record<string, unknown>) ?? {};
}

export default function DCCSheet({ characterId, data, rawGameDataStats, funnelParty }: DCCSheetProps) {
  const name = getVal(data, 'name', 'Unknown');
  const race = getVal(data, 'race', '—');
  const characterClass = getVal(data, 'class', '—');
  const level = getVal(data, 'level', 0);
  const isFunnel = level === 0;
  const alignment = getVal(data, 'alignment', '—');
  const occupation = getVal(data, 'occupation', '—');
  const luckySign = getVal(data, 'luckySign', '');

  const ac = getVal(data, 'ac', 10);
  const hp = getVal(data, 'hp', 0);
  const maxHp = getVal(data, 'maxHp', 0);

  const currentLuck = getVal(data, 'currentLuck', 10);
  const startingLuck = getVal(data, 'startingLuck', 10);

  const deedDie = getVal<string | null>(data, 'deedDie', null);
  const disapprovalRange = getVal<number | null>(data, 'disapprovalRange', null);
  const corruption = getVal<string[]>(data, 'corruption', []);
  const mercurialMagic = getVal<DCCMercurialSpell[]>(data, 'mercurialMagic', []);

  const saves = getRecord(data, 'saves');
  const equipment = getVal<unknown[]>(data, 'equipment', []);
  const weapons = getVal<{ name: string; attackMod: number; damage: string; notes?: string }[]>(
    data,
    'weapons',
    []
  );

  const statLabels = ['STR', 'AGI', 'STA', 'PER', 'INT', 'LCK'];
  const statKeys = ['Strength', 'Agility', 'Stamina', 'Personality', 'Intelligence', 'Luck'];
  const abilityScores = getRecord(data, 'abilityScores');

  const saveLabels: Record<string, string> = {
    fortitude: 'Fortitude',
    reflex: 'Reflex',
    willpower: 'Willpower',
  };

  const handleSaveHp = (newHp: number) => {
    void updateCharacterHp(characterId, newHp);
  };

  const handleSaveLuck = (newLuck: number) => {
    void updateCharacterGameDataStats(characterId, {
      ...(rawGameDataStats ?? {}),
      currentLuck: newLuck,
    });
  };

  return (
    <div className={styles.sheetRoot}>
      {funnelParty && funnelParty.length > 0 && (
        <div className={styles.funnelRoster}>
          <div className={styles.sectionLabel}>Funnel Party</div>
          <div className={styles.funnelList}>
            {funnelParty.map((m) => (
              <div key={m.id} className={styles.funnelCard}>
                <span className={styles.funnelName}>{m.name}</span>
                {m.occupation && <span className={styles.funnelOccupation}>{m.occupation}</span>}
                {m.hp && (
                  <span className={styles.funnelHp}>
                    {m.hp.current}/{m.hp.max} HP
                  </span>
                )}
                {m.ac != null && <span className={styles.funnelAc}>AC {m.ac}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className={styles.sheetHeader}>
        <div className={styles.headerTop}>
          <h3 className={styles.sheetName}>{name}</h3>
          {isFunnel && <span className={styles.funnelBadge}>Level 0 · Funnel</span>}
        </div>
        <p className={styles.sheetMeta}>
          {race} {characterClass !== '—' ? characterClass : ''} · Level {level} · {alignment}
        </p>
        <p className={styles.occupationLine}>
          <span className={styles.occupationLabel}>Occupation</span> {occupation}
        </p>
        {luckySign && (
          <p className={styles.luckySignLine}>
            <span className={styles.occupationLabel}>Lucky Sign</span> {luckySign}
          </p>
        )}
      </div>

      {/* Ability Scores */}
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
            <span className={styles.combatLabel}>AC</span>
            <span className={`${styles.combatValue} ${styles.ac}`}>{ac}</span>
          </div>
          <div className={styles.combatBox}>
            <span className={styles.combatLabel}>HP</span>
            <span className={`${styles.combatValue} ${styles.hp}`}>
              <InlineNumberEditor value={hp} onSave={handleSaveHp} ariaLabel="Current HP" />
              /{maxHp}
            </span>
          </div>
          {deedDie && (
            <div className={styles.combatBox}>
              <span className={styles.combatLabel}>Deed Die</span>
              <span className={`${styles.combatValue} ${styles.deedDie}`}>{deedDie}</span>
            </div>
          )}
        </div>
      </div>

      {/* Luck */}
      <div>
        <div className={styles.sectionLabel}>Luck</div>
        <div className={styles.luckGrid}>
          <div className={styles.luckBox}>
            <span className={styles.combatLabel}>Current</span>
            <span className={`${styles.combatValue} ${styles.luck}`}>
              <InlineNumberEditor value={currentLuck} onSave={handleSaveLuck} ariaLabel="Current Luck" />
            </span>
          </div>
          <div className={styles.luckBox}>
            <span className={styles.combatLabel}>Starting</span>
            <span className={styles.combatValue}>{startingLuck}</span>
          </div>
        </div>
      </div>

      {/* Saves */}
      {Object.keys(saves).length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Saving Throws</div>
          {Object.entries(saveLabels).map(([key, label]) => (
            <div key={key} className={styles.saveRow}>
              <span className={styles.saveName}>{label}</span>
              <span className={styles.saveVal}>{(saves[key] as number) ?? '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Disapproval (Clerics) */}
      {disapprovalRange != null && (
        <div>
          <div className={styles.sectionLabel}>Disapproval</div>
          <p className={styles.profText}>Disapproval on a roll of 1–{disapprovalRange}</p>
        </div>
      )}

      {/* Corruption (Wizards/Elves) */}
      {corruption.length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Corruption</div>
          <ul className={styles.plainList}>
            {corruption.map((c, i) => (
              <li key={i} className={styles.plainListItem}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mercurial Magic (Wizards/Elves) */}
      {mercurialMagic.length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Mercurial Magic</div>
          <ul className={styles.plainList}>
            {mercurialMagic.map((m, i) => (
              <li key={i} className={styles.plainListItem}>
                <span className={styles.spellName}>{m.spell}:</span> {m.effect}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weapons */}
      {weapons.length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Weapons</div>
          <ul className={styles.plainList}>
            {weapons.map((w, i) => (
              <li key={i} className={styles.plainListItem}>
                <span className={styles.spellName}>{w.name}:</span> {w.attackMod >= 0 ? `+${w.attackMod}` : w.attackMod} to hit, {w.damage}
                {w.notes ? ` (${w.notes})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <EquipmentList items={equipment} />
    </div>
  );
}
