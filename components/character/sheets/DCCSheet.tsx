'use client';

import styles from './DCCSheet.module.css';
import BaseSheet from './BaseSheet';
import InlineNumberEditor from '../InlineNumberEditor';
import schema from '@/lib/character/sheet-schema/dcc';
import type { DCCMercurialSpell } from '@/lib/types/dcc-character';
import { updateCharacterGameDataColumn } from '@/lib/characters/character-updates';

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
  compact?: boolean;
}

export default function DCCSheet({
  characterId,
  data,
  rawGameDataStats,
  funnelParty,
  compact,
}: DCCSheetProps) {
  const level = (data.level as number) ?? 0;
  const isFunnel = level === 0;
  const race = (data.race as string) ?? '—';
  const characterClass = (data.class as string) ?? '—';
  const alignment = (data.alignment as string) ?? '—';
  const occupation = (data.occupation as string) ?? '—';
  const luckySign = (data.luckySign as string) ?? '';

  const currentLuck = (data.currentLuck as number) ?? 10;
  const startingLuck = (data.startingLuck as number) ?? 10;

  const mercurialMagic = (data.mercurialMagic as DCCMercurialSpell[] | undefined) ?? [];
  const weapons =
    (data.weapons as { name: string; attackMod: number; damage: string; notes?: string }[] | undefined) ??
    [];

  const handleSaveLuck = (newLuck: number) => {
    void updateCharacterGameDataColumn(characterId, 'game_data_stats', {
      ...(rawGameDataStats ?? {}),
      currentLuck: newLuck,
    });
  };

  return (
    <BaseSheet
      characterId={characterId}
      gameSystem="DCC"
      schema={schema}
      data={data}
      equipment={(data.equipment as unknown[]) ?? []}
      metaLines={[
        `${race} ${characterClass !== '—' ? characterClass : ''} · Level ${level} · ${alignment}`,
      ]}
      headerBadge={isFunnel ? 'Level 0 · Funnel' : undefined}
      compact={compact}
      headerExtra={
        <>
          <p className={styles.occupationLine}>
            <span className={styles.occupationLabel}>Occupation</span> {occupation}
          </p>
          {luckySign && (
            <p className={styles.luckySignLine}>
              <span className={styles.occupationLabel}>Lucky Sign</span> {luckySign}
            </p>
          )}
        </>
      }
      beforeContent={
        funnelParty &&
        funnelParty.length > 0 && (
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
        )
      }
      extra={
        <>
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

          {weapons.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>Weapons</div>
              <ul className={styles.plainList}>
                {weapons.map((w, i) => (
                  <li key={i} className={styles.plainListItem}>
                    <span className={styles.spellName}>{w.name}:</span>{' '}
                    {w.attackMod >= 0 ? `+${w.attackMod}` : w.attackMod} to hit, {w.damage}
                    {w.notes ? ` (${w.notes})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      }
    />
  );
}
