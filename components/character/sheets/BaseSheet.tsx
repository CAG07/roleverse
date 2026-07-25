'use client';

import type { ReactNode } from 'react';
import styles from './BaseSheet.module.css';
import InlineNumberEditor from '../InlineNumberEditor';
import EquipmentList from '../EquipmentList';
import CustomFieldsSection from '../CustomFieldsSection';
import { updateCharacterHp } from '@/lib/characters/character-updates';
import { getGameSystem } from '@/lib/game-systems/registry';
import { abilityAbbreviation } from '@/lib/character/sheet-schema';
import type { SheetField, SystemSheetSchema } from '@/lib/character/sheet-schema/types';
import type { CustomField } from '@/lib/types/character';

interface BaseSheetProps {
  characterId: string;
  gameSystem: string;
  schema: SystemSheetSchema;
  data: Record<string, unknown>;
  equipment?: unknown[];
  /** Header sub-lines under the name, e.g. "Human Fighter · Level 3". */
  metaLines: string[];
  /** Rendered as the first thing in the sheet, above the header (e.g. DCC's funnel roster). */
  beforeContent?: ReactNode;
  /** Small badge text next to the name, e.g. DCC's "Level 0 · Funnel". */
  headerBadge?: string;
  /** Rendered inside the header, under the meta lines (e.g. DCC's occupation/lucky sign). */
  headerExtra?: ReactNode;
  showAbilityModifiers?: boolean;
  /** Bespoke per-system sections rendered after the schema-driven ones, before custom fields. */
  extra?: ReactNode;
  /** Schema field keys still needed for the creation/edit form but given bespoke display
   *  instead of the generic renderer (e.g. PF2E's rank-badge-colored proficiency ranks). */
  hiddenFieldKeys?: string[];
}

function abilityModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function isCombatScalar(field: SheetField): field is Extract<SheetField, { kind: 'number' | 'string' }> {
  return field.column === 'combat' && (field.kind === 'number' || field.kind === 'string');
}

function renderSchemaField(field: SheetField, data: Record<string, unknown>) {
  switch (field.kind) {
    case 'string-list': {
      const items = (data[field.key] as string[] | undefined) ?? [];
      if (items.length === 0) return null;
      return (
        <div key={field.key}>
          <div className={styles.sectionLabel}>{field.label}</div>
          <p className={styles.profText}>{items.join(', ')}</p>
        </div>
      );
    }
    case 'record-fixed': {
      const record = (data[field.key] as Record<string, number> | undefined) ?? {};
      if (Object.keys(record).length === 0) return null;
      return (
        <div key={field.key}>
          <div className={styles.sectionLabel}>{field.label}</div>
          {field.keys.map((k) => (
            <div key={k} className={styles.saveRow}>
              <span className={styles.saveName}>{field.labels[k] ?? k}</span>
              <span className={styles.saveVal}>{(record[k] as number | undefined) ?? '—'}</span>
            </div>
          ))}
        </div>
      );
    }
    case 'record-open': {
      const record = (data[field.key] as Record<string, number> | undefined) ?? {};
      const entries = Object.entries(record);
      if (entries.length === 0) return null;
      return (
        <div key={field.key}>
          <div className={styles.sectionLabel}>{field.label}</div>
          <div className={styles.openRanks}>
            {entries.map(([name, value]) => (
              <div key={name} className={styles.openRankRow}>
                <span className={styles.openRankName}>{name}</span>
                <span className={styles.openRankName}>{signed(value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'spell-slots': {
      const record = (data[field.key] as Record<string, number> | undefined) ?? {};
      const entries = Object.entries(record);
      if (entries.length === 0) return null;
      return (
        <div key={field.key}>
          <div className={styles.sectionLabel}>{field.label}</div>
          <div className={styles.spellSlots}>
            {entries.map(([lvl, count]) => (
              <span key={lvl} className={styles.spellSlot}>
                Lv{lvl}: {count}
              </span>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

export default function BaseSheet({
  characterId,
  gameSystem,
  schema,
  data,
  equipment = [],
  metaLines,
  beforeContent,
  headerBadge,
  headerExtra,
  showAbilityModifiers = false,
  extra,
  hiddenFieldKeys = [],
}: BaseSheetProps) {
  const name = (data.name as string) ?? 'Unknown';
  const hp = (data.hp as number) ?? 0;
  const maxHp = (data.maxHp as number) ?? 0;

  const abilityScoreNames = getGameSystem(gameSystem)?.abilityScores ?? [];
  const abilityScores = (data.abilityScores as Record<string, number> | undefined) ?? {};

  const combatScalarFields = schema.fields.filter(isCombatScalar);
  const consumedKeys = new Set([...combatScalarFields.map((f) => f.key), ...hiddenFieldKeys]);
  const remainingFields = schema.fields.filter((f) => !consumedKeys.has(f.key));

  const customFields = (data.customFields as CustomField[] | undefined) ?? [];

  return (
    <div className={styles.sheetRoot}>
      {beforeContent}
      <div className={styles.sheetHeader}>
        <div className={styles.headerTop}>
          <h3 className={styles.sheetName}>{name}</h3>
          {headerBadge && <span className={styles.headerBadge}>{headerBadge}</span>}
        </div>
        {metaLines.map((line, i) => (
          <p key={i} className={styles.sheetMeta}>
            {line}
          </p>
        ))}
        {headerExtra}
      </div>

      {abilityScoreNames.length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Ability Scores</div>
          <div className={styles.statsGrid}>
            {abilityScoreNames.map((full) => {
              const score = abilityScores[full];
              return (
                <div key={full} className={styles.statBox}>
                  <span className={styles.statLabel}>{abilityAbbreviation(full)}</span>
                  <span className={styles.statValue}>{score ?? '—'}</span>
                  {showAbilityModifiers && score != null && (
                    <span className={styles.statMod}>{abilityModifier(score)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className={styles.sectionLabel}>Combat</div>
        <div className={styles.combatGrid}>
          <div className={styles.combatBox}>
            <span className={styles.combatLabel}>HP</span>
            <span className={`${styles.combatValue} ${styles.hp}`}>
              <InlineNumberEditor
                value={hp}
                onSave={(newHp) => void updateCharacterHp(characterId, newHp)}
                ariaLabel="Current HP"
              />
              /{maxHp}
            </span>
          </div>
          {combatScalarFields.map((field) => (
            <div key={field.key} className={styles.combatBox}>
              <span className={styles.combatLabel}>{field.label}</span>
              <span className={`${styles.combatValue} ${styles.dynamic}`}>
                {(data[field.key] as number | string | undefined) ?? '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {remainingFields.map((field) => renderSchemaField(field, data))}

      {extra}

      <CustomFieldsSection characterId={characterId} customFields={customFields} />

      <EquipmentList items={equipment} />
    </div>
  );
}
