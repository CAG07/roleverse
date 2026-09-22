// lib/character/import/diff.ts
// Turns a ParsedCharacterImport into (a) a human-readable list of what would
// change on the CURRENT character, for the review-before-apply screen, and
// (b) the actual Supabase update payload once the player confirms. Nothing
// here writes anything — see ImportReviewModal.tsx for the apply step.
import { getSheetSchema } from '@/lib/character/sheet-schema';
import type { SheetField } from '@/lib/character/sheet-schema/types';
import { getGameSystem } from '@/lib/game-systems/registry';
import type { AssembledCharacterData } from '@/lib/types/character';
import type { ParsedCharacterImport } from './types';

export interface DiffRow {
  label: string;
  oldValue: string;
  newValue: string;
}

export interface ImportPreview {
  rows: DiffRow[];
  hasChanges: boolean;
}

export interface CharacterForImport {
  name: string;
  race: string | null;
  class: string | null;
  level: number | null;
  hp: number | null;
  max_hp: number | null;
  notes: string | null;
  equipment: unknown[] | null;
  game_data_stats: Record<string, unknown> | null;
  game_data_combat: Record<string, unknown> | null;
  game_data_saves: Record<string, unknown> | null;
  game_data_skills: Record<string, unknown> | null;
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

function valuesDiffer(a: unknown, b: unknown): boolean {
  if (isEmpty(a) && isEmpty(b)) return false;
  return JSON.stringify(a) !== JSON.stringify(b);
}

function formatFieldValue(field: SheetField, value: unknown): string {
  if (isEmpty(value)) return '—';
  switch (field.kind) {
    case 'number':
    case 'string':
    case 'text':
      return String(value);
    case 'string-list':
      return (value as string[]).join(', ');
    case 'record-fixed': {
      const record = value as Record<string, number>;
      return (
        field.keys
          .filter((k) => record[k] != null)
          .map((k) => `${field.labels[k] ?? k}: ${record[k]}`)
          .join(', ') || '—'
      );
    }
    case 'record-open': {
      const record = value as Record<string, number>;
      return Object.entries(record).map(([k, v]) => `${k}: ${v}`).join(', ') || '—';
    }
    case 'spell-slots': {
      const record = value as Record<string, number>;
      return Object.entries(record).map(([lvl, c]) => `Lv${lvl} x${c}`).join(', ') || '—';
    }
    case 'table': {
      const rows = value as Record<string, unknown>[];
      return `${rows.length} row${rows.length === 1 ? '' : 's'}`;
    }
    default:
      return '—';
  }
}

function formatEquipment(items: { name: string; quantity?: number }[] | unknown[] | null | undefined): string {
  if (!items || items.length === 0) return '—';
  return items
    .map((raw) => {
      const r = (raw ?? {}) as { name?: string; quantity?: number };
      return r.quantity && r.quantity !== 1 ? `${r.name} x${r.quantity}` : (r.name ?? '');
    })
    .filter(Boolean)
    .join(', ');
}

export function buildImportDiff(
  gameSystem: string,
  character: CharacterForImport,
  sheetData: AssembledCharacterData,
  parsed: ParsedCharacterImport
): ImportPreview {
  const rows: DiffRow[] = [];
  const schema = getSheetSchema(gameSystem);

  const pushIfDiffers = (label: string, oldValue: unknown, newValue: unknown, format: (v: unknown) => string) => {
    if (newValue === undefined) return;
    if (!valuesDiffer(oldValue, newValue)) return;
    rows.push({ label, oldValue: format(oldValue), newValue: format(newValue) });
  };

  const str = (v: unknown) => (isEmpty(v) ? '—' : String(v));
  pushIfDiffers('Name', character.name, parsed.name, str);
  pushIfDiffers('Race', character.race, parsed.race, str);
  pushIfDiffers('Class', character.class, parsed.class, str);
  pushIfDiffers('Level', character.level, parsed.level, str);

  if (parsed.hp !== undefined || parsed.maxHp !== undefined) {
    const oldHp = `${character.hp ?? '—'} / ${character.max_hp ?? '—'}`;
    const newHp = `${parsed.hp ?? character.hp ?? '—'} / ${parsed.maxHp ?? character.max_hp ?? '—'}`;
    if (oldHp !== newHp) rows.push({ label: 'HP', oldValue: oldHp, newValue: newHp });
  }

  const parsedAbilityScores = parsed.columns.stats.abilityScores as Record<string, number> | undefined;
  if (parsedAbilityScores) {
    const currentAbilityScores = (sheetData.abilityScores as Record<string, number> | undefined) ?? {};
    const abilityNames = getGameSystem(gameSystem)?.abilityScores ?? Object.keys(parsedAbilityScores);
    const changed = abilityNames
      .filter((name) => parsedAbilityScores[name] != null && parsedAbilityScores[name] !== currentAbilityScores[name])
      .map((name) => `${name.slice(0, 3).toUpperCase()}: ${currentAbilityScores[name] ?? '—'} → ${parsedAbilityScores[name]}`);
    if (changed.length > 0) {
      rows.push({ label: 'Ability Scores', oldValue: '(see changes)', newValue: changed.join(', ') });
    }
  }

  if (schema) {
    for (const field of schema.fields) {
      const newValue = parsed.columns[field.column][field.key];
      if (newValue === undefined) continue;
      const oldValue = sheetData[field.key];
      pushIfDiffers(field.label, oldValue, newValue, (v) => formatFieldValue(field, v));
    }
  }

  if (parsed.equipment && parsed.equipment.length > 0) {
    const oldEquipment = formatEquipment(character.equipment as { name: string; quantity?: number }[] | null);
    const newEquipment = formatEquipment(parsed.equipment);
    if (oldEquipment !== newEquipment) {
      rows.push({ label: 'Equipment', oldValue: oldEquipment, newValue: newEquipment });
    }
  }

  if (parsed.notes && parsed.notes.trim()) {
    rows.push({
      label: 'Notes (appended, not replaced)',
      oldValue: character.notes ? '(existing notes kept as-is)' : '(no existing notes)',
      newValue: parsed.notes.length > 200 ? `${parsed.notes.slice(0, 200)}…` : parsed.notes,
    });
  }

  return { rows, hasChanges: rows.length > 0 };
}

export function buildImportUpdatePayload(character: CharacterForImport, parsed: ParsedCharacterImport) {
  const notes =
    parsed.notes && parsed.notes.trim()
      ? [character.notes, `— Imported —\n${parsed.notes.trim()}`].filter(Boolean).join('\n\n')
      : character.notes;

  return {
    name: parsed.name ?? character.name,
    race: parsed.race ?? character.race,
    class: parsed.class ?? character.class,
    level: parsed.level ?? character.level,
    hp: parsed.hp ?? character.hp,
    max_hp: parsed.maxHp ?? character.max_hp,
    notes,
    game_data_stats: { ...(character.game_data_stats ?? {}), ...parsed.columns.stats },
    game_data_combat: { ...(character.game_data_combat ?? {}), ...parsed.columns.combat },
    game_data_saves: { ...(character.game_data_saves ?? {}), ...parsed.columns.saves },
    game_data_skills: { ...(character.game_data_skills ?? {}), ...parsed.columns.skills },
    ...(parsed.equipment && parsed.equipment.length > 0 ? { equipment: parsed.equipment } : {}),
  };
}
