// lib/character/export/plain-text.ts
// Generic, schema-driven plain-text character sheet — a portable document usable
// outside RoleVerse entirely (any text editor, printed at a table, pasted into a
// message), independent of Fantasy Grounds. Works uniformly across all 5 systems
// by walking the same SystemSheetSchema BaseSheet renders from, rather than a
// bespoke template per system. (DCC's FG-facing export at
// lib/character/export/fantasy-grounds/dcc.ts additionally covers DCC's bespoke
// non-schema fields — occupation, Luck, mercurial magic, weapons — since that
// export exists specifically to be hand-transcribed into Fantasy Grounds; this
// generic version intentionally stays schema-only, matching what BaseSheet
// itself renders in the "Full" view before any bespoke `extra` content.)
import { getSheetSchema } from '@/lib/character/sheet-schema';
import type { AssembledCharacterData } from '@/lib/types/character';
import type { SheetField } from '@/lib/character/sheet-schema/types';
import { getGameSystem } from '@/lib/game-systems/registry';

function fieldLines(field: SheetField, data: Record<string, unknown>): string[] {
  switch (field.kind) {
    case 'number':
    case 'string': {
      const value = data[field.key];
      if (value == null || value === '') return [];
      return [`${field.label}: ${value}`];
    }
    case 'text': {
      const value = data[field.key] as string | undefined;
      if (!value) return [];
      return [`${field.label}:`, ...value.split('\n').map((line) => `  ${line}`)];
    }
    case 'string-list': {
      const items = (data[field.key] as string[] | undefined) ?? [];
      if (items.length === 0) return [];
      return [`${field.label}:`, ...items.map((i) => `  - ${i}`)];
    }
    case 'record-fixed': {
      const record = (data[field.key] as Record<string, number> | undefined) ?? {};
      const entries = field.keys.filter((k) => record[k] != null);
      if (entries.length === 0) return [];
      return [`${field.label}:`, ...entries.map((k) => `  ${field.labels[k] ?? k}: ${record[k]}`)];
    }
    case 'record-open': {
      const record = (data[field.key] as Record<string, number> | undefined) ?? {};
      const entries = Object.entries(record);
      if (entries.length === 0) return [];
      return [`${field.label}:`, ...entries.map(([name, value]) => `  ${name}: ${value}`)];
    }
    case 'spell-slots': {
      const record = (data[field.key] as Record<string, number> | undefined) ?? {};
      const entries = Object.entries(record);
      if (entries.length === 0) return [];
      return [`${field.label}: ${entries.map(([lvl, count]) => `Lv${lvl} x${count}`).join(', ')}`];
    }
    case 'table': {
      const rows = (data[field.key] as Record<string, unknown>[] | undefined) ?? [];
      if (rows.length === 0) return [];
      return [
        `${field.label}:`,
        ...rows.map((row) =>
          `  - ${field.columns
            .filter((col) => row[col.key] != null)
            .map((col) => `${col.label}: ${row[col.key]}`)
            .join(', ')}`
        ),
      ];
    }
    default:
      return [];
  }
}

function equipmentLines(equipment: unknown[]): string[] {
  if (equipment.length === 0) return [];
  const lines = equipment.map((raw) => {
    if (typeof raw === 'string') return `  - ${raw}`;
    const r = (raw ?? {}) as Record<string, unknown>;
    const name = (r.name as string) ?? (r.item as string) ?? (r.title as string) ?? 'Unknown item';
    const qty = (r.quantity as number) ?? (r.qty as number) ?? (r.count as number);
    return `  - ${name}${qty ? ` x${qty}` : ''}`;
  });
  return ['Equipment:', ...lines];
}

export function buildPlainTextSheet(
  gameSystem: string,
  data: AssembledCharacterData,
  equipment: unknown[]
): string | null {
  const schema = getSheetSchema(gameSystem);
  if (!schema) return null;

  const lines: string[] = [];
  const title = `${data.name ?? 'Unknown'} — ${getGameSystem(gameSystem)?.name ?? gameSystem}`;
  lines.push(title);
  lines.push('='.repeat(title.length));
  lines.push('');
  lines.push(
    [data.race, data.class, data.level != null ? `Level ${data.level}` : null].filter(Boolean).join(' · ')
  );
  if (data.hp != null || data.maxHp != null) {
    lines.push(`HP: ${data.hp ?? '—'} / ${data.maxHp ?? '—'}`);
  }
  lines.push('');

  const abilityScoreNames = getGameSystem(gameSystem)?.abilityScores ?? [];
  const abilityScores = (data.abilityScores as Record<string, number> | undefined) ?? {};
  if (abilityScoreNames.length > 0) {
    lines.push('Ability Scores:');
    for (const name of abilityScoreNames) {
      if (abilityScores[name] != null) lines.push(`  ${name}: ${abilityScores[name]}`);
    }
    lines.push('');
  }

  for (const field of schema.fields) {
    const fLines = fieldLines(field, data);
    if (fLines.length === 0) continue;
    lines.push(...fLines, '');
  }

  const eqLines = equipmentLines(equipment);
  if (eqLines.length > 0) lines.push(...eqLines, '');

  lines.push('— exported from RoleVerse —');

  return lines.join('\n');
}
