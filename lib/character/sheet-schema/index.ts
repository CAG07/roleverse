// lib/character/sheet-schema/index.ts
// Lookup + the generic draft -> JSONB-column bucketer shared by NewCharacterForm and
// EditCharacterPage. Mirrors the lookup pattern in lib/game-systems/registry.ts, but this
// is a separate, UI-focused schema — the registry's own `characterSchema` hint stays a
// loose thing used for agent prompting, untouched by this module.

import type { FieldDraft, KeyedDraft, OpenDraft, SheetField, SystemSheetSchema, TableDraft } from './types';
import add1e from './add1e';
import add2e from './add2e';
import dnd5e from './dnd5e';
import pf2e from './pf2e';
import dcc from './dcc';
import dnd35e from './dnd35e';
import dnd4e from './dnd4e';
import tor2e from './tor2e';
import cyberpunk2020 from './cyberpunk2020';
import fallout2d20 from './fallout2d20';

const schemas: Record<string, SystemSheetSchema> = {
  [add1e.gameSystem]: add1e,
  [add2e.gameSystem]: add2e,
  [dnd5e.gameSystem]: dnd5e,
  [pf2e.gameSystem]: pf2e,
  [dcc.gameSystem]: dcc,
  [dnd35e.gameSystem]: dnd35e,
  [dnd4e.gameSystem]: dnd4e,
  [tor2e.gameSystem]: tor2e,
  [cyberpunk2020.gameSystem]: cyberpunk2020,
  [fallout2d20.gameSystem]: fallout2d20,
};

export function getSheetSchema(gameSystem: string): SystemSheetSchema | null {
  return schemas[gameSystem] ?? null;
}

/** Short header abbreviation for a full ability score name (e.g. "Strength" -> "STR"). */
export function abilityAbbreviation(name: string): string {
  return name.slice(0, 3).toUpperCase();
}

export interface GameDataColumns {
  stats: Record<string, unknown>;
  combat: Record<string, unknown>;
  saves: Record<string, unknown>;
  skills: Record<string, unknown>;
}

function parseNumber(raw: string): number | undefined {
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? undefined : n;
}

function buildKeyedRecord(keys: string[], draft: KeyedDraft): Record<string, number> | undefined {
  const entries = keys
    .map((k) => [k, parseNumber(draft[k] ?? '')] as const)
    .filter((entry): entry is [string, number] => entry[1] !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function buildOpenRecord(entries: OpenDraft): Record<string, number> | undefined {
  const parsed = entries
    .map((e) => [e.name.trim(), parseNumber(e.value)] as const)
    .filter((e): e is [string, number] => e[0].length > 0 && e[1] !== undefined);
  return parsed.length > 0 ? Object.fromEntries(parsed) : undefined;
}

function buildTable(
  columns: { key: string; type: 'text' | 'number' }[],
  rows: TableDraft
): Record<string, unknown>[] | undefined {
  const built = rows
    .map((row) => {
      const out: Record<string, unknown> = {};
      for (const col of columns) {
        const raw = row[col.key] ?? '';
        if (col.type === 'number') {
          const n = parseNumber(raw);
          if (n !== undefined) out[col.key] = n;
        } else {
          const trimmed = raw.trim();
          if (trimmed.length > 0) out[col.key] = trimmed;
        }
      }
      return out;
    })
    .filter((row) => Object.keys(row).length > 0);
  return built.length > 0 ? built : undefined;
}

function fieldValue(field: SheetField, draft: FieldDraft): unknown {
  switch (field.kind) {
    case 'number':
      return parseNumber(draft as string);
    case 'string':
    case 'text': {
      const trimmed = (draft as string).trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    case 'string-list': {
      const lines = (draft as string)
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      return lines.length > 0 ? lines : undefined;
    }
    case 'record-fixed':
      return buildKeyedRecord(field.keys, draft as KeyedDraft);
    case 'spell-slots':
      return buildKeyedRecord(field.levels, draft as KeyedDraft);
    case 'record-open':
      return buildOpenRecord(draft as OpenDraft);
    case 'table':
      return buildTable(field.columns, draft as TableDraft);
    default:
      return undefined;
  }
}

const ABILITY_SCORE_KEY = 'abilityScores';

/**
 * Buckets a schema-driven form draft (plus the universal ability-score inputs) into
 * the four flexible JSONB columns, keyed by each field's own `key` — so the existing
 * assembleCharacterData/spread convention (game_data_stats.abilityScores nested,
 * everything else flat) picks it up unchanged.
 */
export function buildGameDataColumns(
  schema: SystemSheetSchema,
  abilityScores: Record<string, string>,
  draft: Record<string, FieldDraft>
): GameDataColumns {
  const columns: GameDataColumns = { stats: {}, combat: {}, saves: {}, skills: {} };

  const abilityEntries = Object.entries(abilityScores)
    .map(([name, raw]) => [name, parseNumber(raw)] as const)
    .filter((e): e is [string, number] => e[1] !== undefined);
  if (abilityEntries.length > 0) {
    columns.stats[ABILITY_SCORE_KEY] = Object.fromEntries(abilityEntries);
  }

  for (const field of schema.fields) {
    const value = fieldValue(field, draft[field.key] ?? '');
    if (value === undefined) continue;
    columns[field.column][field.key] = value;
  }

  return columns;
}
