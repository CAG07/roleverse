'use client';

import styles from './SystemFields.module.css';
import { getGameSystem } from '@/lib/game-systems/registry';
import {
  getSheetSchema,
  buildGameDataColumns,
  abilityAbbreviation,
  type GameDataColumns,
} from '@/lib/character/sheet-schema';
import {
  emptySchemaDraft,
  type KeyedDraft,
  type OpenDraft,
  type SchemaDraft,
  type SheetField,
  type TableDraft,
} from '@/lib/character/sheet-schema/types';

export interface DccBespokeValue {
  occupation: string;
  luckySign: string;
  alignment: 'Lawful' | 'Neutral' | 'Chaotic';
  currentLuck: string;
  startingLuck: string;
  mercurialMagicText: string;
}

export const DCC_BESPOKE_DEFAULT: DccBespokeValue = {
  occupation: '',
  luckySign: '',
  alignment: 'Neutral',
  currentLuck: '10',
  startingLuck: '10',
  mercurialMagicText: '',
};

export interface SystemFieldsValue {
  abilityScores: Record<string, string>;
  fields: SchemaDraft;
  dcc: DccBespokeValue;
}

export function createSystemFieldsValue(gameSystem: string): SystemFieldsValue {
  const schema = getSheetSchema(gameSystem);
  const abilityNames = getGameSystem(gameSystem)?.abilityScores ?? [];
  return {
    abilityScores: Object.fromEntries(abilityNames.map((n) => [n, ''])),
    fields: schema ? emptySchemaDraft(schema) : {},
    dcc: { ...DCC_BESPOKE_DEFAULT },
  };
}

interface RawColumns {
  stats: Record<string, unknown>;
  combat: Record<string, unknown>;
  saves: Record<string, unknown>;
  skills: Record<string, unknown>;
}

function hydrateFieldDraft(field: SheetField, columnValue: Record<string, unknown>) {
  const raw = columnValue[field.key];
  switch (field.kind) {
    case 'number':
    case 'string':
    case 'text':
      return raw != null ? String(raw) : '';
    case 'string-list':
      return Array.isArray(raw) ? (raw as string[]).join('\n') : '';
    case 'record-fixed': {
      const record = (raw as Record<string, number> | undefined) ?? {};
      const draft: KeyedDraft = {};
      for (const k of field.keys) draft[k] = record[k] != null ? String(record[k]) : '';
      return draft;
    }
    case 'spell-slots': {
      const record = (raw as Record<string, number> | undefined) ?? {};
      const draft: KeyedDraft = {};
      for (const lvl of field.levels) draft[lvl] = record[lvl] != null ? String(record[lvl]) : '';
      return draft;
    }
    case 'record-open': {
      const record = (raw as Record<string, number> | undefined) ?? {};
      const entries: OpenDraft = Object.entries(record).map(([name, value]) => ({
        name,
        value: String(value),
      }));
      return entries;
    }
    case 'table': {
      const rows = (raw as Record<string, unknown>[] | undefined) ?? [];
      const draft: TableDraft = rows.map((row) =>
        Object.fromEntries(field.columns.map((col) => [col.key, row[col.key] != null ? String(row[col.key]) : '']))
      );
      return draft;
    }
    default:
      return '';
  }
}

/** Pre-populates a SystemFieldsValue from a character's existing 4 JSONB columns, for editing. */
export function hydrateSystemFieldsValue(gameSystem: string, columns: RawColumns): SystemFieldsValue {
  const schema = getSheetSchema(gameSystem);
  const abilityNames = getGameSystem(gameSystem)?.abilityScores ?? [];
  const storedAbilityScores = (columns.stats.abilityScores as Record<string, number> | undefined) ?? {};

  const byColumn: Record<'stats' | 'combat' | 'saves' | 'skills', Record<string, unknown>> = {
    stats: columns.stats,
    combat: columns.combat,
    saves: columns.saves,
    skills: columns.skills,
  };

  const fields: SchemaDraft = {};
  if (schema) {
    for (const field of schema.fields) {
      fields[field.key] = hydrateFieldDraft(field, byColumn[field.column]);
    }
  }

  const mercurialMagic = (columns.stats.mercurialMagic as { spell: string; effect: string }[] | undefined) ?? [];

  return {
    abilityScores: Object.fromEntries(
      abilityNames.map((n) => [n, storedAbilityScores[n] != null ? String(storedAbilityScores[n]) : ''])
    ),
    fields,
    dcc: {
      occupation: (columns.stats.occupation as string) ?? '',
      luckySign: (columns.stats.luckySign as string) ?? '',
      alignment: (columns.stats.alignment as DccBespokeValue['alignment']) ?? 'Neutral',
      currentLuck:
        columns.stats.currentLuck != null ? String(columns.stats.currentLuck) : DCC_BESPOKE_DEFAULT.currentLuck,
      startingLuck:
        columns.stats.startingLuck != null
          ? String(columns.stats.startingLuck)
          : DCC_BESPOKE_DEFAULT.startingLuck,
      mercurialMagicText: mercurialMagic.map((m) => `${m.spell}: ${m.effect}`).join('\n'),
    },
  };
}

/** Buckets a SystemFieldsValue into the 4 JSONB columns ready for insert/update, folding in
 *  DCC's bespoke fields (which don't fit a generic schema kind) alongside the schema-driven ones. */
export function buildCharacterColumns(gameSystem: string, value: SystemFieldsValue): GameDataColumns {
  const schema = getSheetSchema(gameSystem);
  const columns = schema
    ? buildGameDataColumns(schema, value.abilityScores, value.fields)
    : { stats: {}, combat: {}, saves: {}, skills: {} };

  if (gameSystem === 'DCC') {
    const d = value.dcc;
    const mercurialMagic = d.mercurialMagicText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf(':');
        if (idx === -1) return { spell: line, effect: '' };
        return { spell: line.slice(0, idx).trim(), effect: line.slice(idx + 1).trim() };
      });

    columns.stats.occupation = d.occupation.trim();
    columns.stats.luckySign = d.luckySign.trim();
    columns.stats.alignment = d.alignment;
    columns.stats.currentLuck = parseInt(d.currentLuck, 10) || 0;
    columns.stats.startingLuck = parseInt(d.startingLuck, 10) || 0;
    if (mercurialMagic.length > 0) columns.stats.mercurialMagic = mercurialMagic;
  }

  return columns;
}

interface SystemFieldsProps {
  gameSystem: string;
  value: SystemFieldsValue;
  onChange: (value: SystemFieldsValue) => void;
}

export default function SystemFields({ gameSystem, value, onChange }: SystemFieldsProps) {
  const schema = getSheetSchema(gameSystem);
  const abilityNames = getGameSystem(gameSystem)?.abilityScores ?? [];

  const setAbilityScore = (name: string, raw: string) => {
    onChange({ ...value, abilityScores: { ...value.abilityScores, [name]: raw } });
  };

  const setField = (key: string, draft: SchemaDraft[string]) => {
    onChange({ ...value, fields: { ...value.fields, [key]: draft } });
  };

  const setDcc = <K extends keyof DccBespokeValue>(key: K, v: DccBespokeValue[K]) => {
    onChange({ ...value, dcc: { ...value.dcc, [key]: v } });
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionDivider}>Ability Scores</div>
      <div className={styles.abilityGrid}>
        {abilityNames.map((name) => (
          <div key={name}>
            <label className={styles.formLabel} htmlFor={`ability-${name}`}>
              {abilityAbbreviation(name)}
            </label>
            <input
              id={`ability-${name}`}
              type="number"
              className={styles.formInput}
              value={value.abilityScores[name] ?? ''}
              onChange={(e) => setAbilityScore(name, e.target.value)}
            />
          </div>
        ))}
      </div>

      {schema && schema.fields.length > 0 && (
        <>
          <div className={styles.sectionDivider}>
            {getGameSystem(gameSystem)?.name ?? gameSystem} Details
          </div>
          {schema.fields.map((field) => (
            <SchemaFieldInput
              key={field.key}
              field={field}
              draft={value.fields[field.key]}
              onChange={(draft) => setField(field.key, draft)}
            />
          ))}
        </>
      )}

      {gameSystem === 'DCC' && (
        <>
          <div className={styles.sectionDivider}>Dungeon Crawl Classics Details</div>

          <div className={styles.formGroup}>
            <label htmlFor="dcc-occupation" className={styles.formLabel}>
              Occupation
            </label>
            <input
              id="dcc-occupation"
              className={styles.formInput}
              value={value.dcc.occupation}
              onChange={(e) => setDcc('occupation', e.target.value)}
              placeholder="e.g. Chicken Butcher, Astrologer"
            />
          </div>

          <div className={styles.formRow}>
            <div>
              <label htmlFor="dcc-luckySign" className={styles.formLabel}>
                Lucky Sign (Birth Augur)
              </label>
              <input
                id="dcc-luckySign"
                className={styles.formInput}
                value={value.dcc.luckySign}
                onChange={(e) => setDcc('luckySign', e.target.value)}
                placeholder="e.g. Harsh winter: all attack rolls"
              />
            </div>
            <div>
              <label htmlFor="dcc-alignment" className={styles.formLabel}>
                Alignment
              </label>
              <select
                id="dcc-alignment"
                className={styles.formInput}
                value={value.dcc.alignment}
                onChange={(e) => setDcc('alignment', e.target.value as DccBespokeValue['alignment'])}
              >
                <option value="Lawful">Lawful</option>
                <option value="Neutral">Neutral</option>
                <option value="Chaotic">Chaotic</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div>
              <label htmlFor="dcc-currentLuck" className={styles.formLabel}>
                Current Luck
              </label>
              <input
                id="dcc-currentLuck"
                type="number"
                className={styles.formInput}
                value={value.dcc.currentLuck}
                onChange={(e) => setDcc('currentLuck', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="dcc-startingLuck" className={styles.formLabel}>
                Starting Luck
              </label>
              <input
                id="dcc-startingLuck"
                type="number"
                className={styles.formInput}
                value={value.dcc.startingLuck}
                onChange={(e) => setDcc('startingLuck', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="dcc-mercurialMagic" className={styles.formLabel}>
              Mercurial Magic (Wizards / Elves) — one per line, as &quot;Spell: Effect&quot;
            </label>
            <textarea
              id="dcc-mercurialMagic"
              className={styles.formTextarea}
              value={value.dcc.mercurialMagicText}
              onChange={(e) => setDcc('mercurialMagicText', e.target.value)}
              rows={2}
              placeholder="e.g. Magic Missile: Caster's eyes glow while casting"
            />
          </div>
        </>
      )}
    </div>
  );
}

function SchemaFieldInput({
  field,
  draft,
  onChange,
}: {
  field: SheetField;
  draft: SchemaDraft[string] | undefined;
  onChange: (draft: SchemaDraft[string]) => void;
}) {
  switch (field.kind) {
    case 'number':
      return (
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor={`field-${field.key}`}>
            {field.label}
          </label>
          <input
            id={`field-${field.key}`}
            type="number"
            className={styles.formInput}
            value={(draft as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case 'string':
      return (
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor={`field-${field.key}`}>
            {field.label}
          </label>
          <input
            id={`field-${field.key}`}
            className={styles.formInput}
            value={(draft as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case 'string-list':
      return (
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor={`field-${field.key}`}>
            {field.label} — one per line
          </label>
          <textarea
            id={`field-${field.key}`}
            className={styles.formTextarea}
            rows={2}
            value={(draft as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case 'text':
      return (
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor={`field-${field.key}`}>
            {field.label}
          </label>
          <textarea
            id={`field-${field.key}`}
            className={styles.formTextarea}
            rows={4}
            value={(draft as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case 'record-fixed': {
      const keyed = (draft as KeyedDraft) ?? {};
      return (
        <div className={styles.formGroup}>
          <div className={styles.formLabel}>{field.label}</div>
          <div className={styles.keyedGrid}>
            {field.keys.map((k) => (
              <div key={k}>
                <label className={styles.formLabel} htmlFor={`field-${field.key}-${k}`}>
                  {field.labels[k] ?? k}
                </label>
                <input
                  id={`field-${field.key}-${k}`}
                  type="number"
                  className={styles.formInput}
                  value={keyed[k] ?? ''}
                  onChange={(e) => onChange({ ...keyed, [k]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'spell-slots': {
      const keyed = (draft as KeyedDraft) ?? {};
      return (
        <div className={styles.formGroup}>
          <div className={styles.formLabel}>{field.label}</div>
          <div className={styles.keyedGrid}>
            {field.levels.map((lvl) => (
              <div key={lvl}>
                <label className={styles.formLabel} htmlFor={`field-${field.key}-${lvl}`}>
                  Level {lvl}
                </label>
                <input
                  id={`field-${field.key}-${lvl}`}
                  type="number"
                  className={styles.formInput}
                  value={keyed[lvl] ?? ''}
                  onChange={(e) => onChange({ ...keyed, [lvl]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'record-open': {
      const entries = (draft as OpenDraft) ?? [];
      return (
        <div className={styles.formGroup}>
          <div className={styles.formLabel}>{field.label}</div>
          {entries.map((entry, i) => (
            <div key={i} className={styles.openRow}>
              <input
                className={styles.formInput}
                placeholder="Name"
                value={entry.name}
                onChange={(e) =>
                  onChange(entries.map((en, idx) => (idx === i ? { ...en, name: e.target.value } : en)))
                }
              />
              <input
                type="number"
                className={styles.formInput}
                placeholder="Value"
                value={entry.value}
                onChange={(e) =>
                  onChange(entries.map((en, idx) => (idx === i ? { ...en, value: e.target.value } : en)))
                }
              />
              <button
                type="button"
                className={styles.openRemove}
                onClick={() => onChange(entries.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${entry.name || field.label} entry`}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => onChange([...entries, { name: '', value: '' }])}
          >
            + Add {field.label.replace(/s$/, '')}
          </button>
        </div>
      );
    }
    case 'table': {
      const rows = (draft as TableDraft) ?? [];
      const emptyRow = Object.fromEntries(field.columns.map((col) => [col.key, '']));
      const gridStyle = { gridTemplateColumns: `repeat(${field.columns.length}, 1fr) auto` };
      return (
        <div className={styles.formGroup}>
          <div className={styles.formLabel}>{field.label}</div>
          {rows.length > 0 && (
            <div className={styles.tableRow} style={gridStyle}>
              {field.columns.map((col) => (
                <span key={col.key} className={styles.tableHeaderCell}>
                  {col.label}
                </span>
              ))}
              <span />
            </div>
          )}
          {rows.map((row, i) => (
            <div key={i} className={styles.tableRow} style={gridStyle}>
              {field.columns.map((col) => (
                <input
                  key={col.key}
                  type={col.type === 'number' ? 'number' : 'text'}
                  className={styles.formInput}
                  placeholder={col.label}
                  value={row[col.key] ?? ''}
                  onChange={(e) =>
                    onChange(rows.map((r, idx) => (idx === i ? { ...r, [col.key]: e.target.value } : r)))
                  }
                />
              ))}
              <button
                type="button"
                className={styles.openRemove}
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${field.label} row`}
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" className={styles.addBtn} onClick={() => onChange([...rows, emptyRow])}>
            + Add Row
          </button>
        </div>
      );
    }
    default:
      return null;
  }
}
