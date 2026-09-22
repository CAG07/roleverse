// lib/character/import/plain-text.ts
// Reverse of lib/character/export/plain-text.ts's buildPlainTextSheet — a
// generic, schema-driven parser that walks the same SystemSheetSchema (one
// implementation for all 5 systems, no per-system template) rather than
// guessing at free-form text. Since this is a round-trip of RoleVerse's own
// export format, it's high-confidence as long as the file wasn't hand-edited
// into a different shape — a line that doesn't match the expected "Label:"
// prefix for its field is simply not found, never guessed at.
import { getSheetSchema } from '@/lib/character/sheet-schema';
import type { SheetField } from '@/lib/character/sheet-schema/types';
import { getGameSystem } from '@/lib/game-systems/registry';
import type { ParsedCharacterImport } from './types';

function parseBlock(lines: string[], label: string): string[] {
  const idx = lines.findIndex((l) => l === `${label}:`);
  if (idx === -1) return [];
  const out: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.startsWith('  ')) break;
    out.push(l.slice(2));
  }
  return out;
}

function parseInline(lines: string[], label: string): string | undefined {
  const line = lines.find((l) => l.startsWith(`${label}: `));
  return line ? line.slice(label.length + 2).trim() : undefined;
}

function parseNumber(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? undefined : n;
}

function invertLabels(labels: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(labels).map(([k, v]) => [v.toLowerCase(), k]));
}

function fieldValueFromLines(lines: string[], field: SheetField): unknown {
  switch (field.kind) {
    case 'number':
      return parseNumber(parseInline(lines, field.label));
    case 'string': {
      const raw = parseInline(lines, field.label);
      return raw && raw !== '' ? raw : undefined;
    }
    case 'text': {
      const block = parseBlock(lines, field.label);
      return block.length > 0 ? block.join('\n') : undefined;
    }
    case 'string-list': {
      const block = parseBlock(lines, field.label)
        .filter((l) => l.startsWith('- '))
        .map((l) => l.slice(2).trim())
        .filter(Boolean);
      return block.length > 0 ? block : undefined;
    }
    case 'record-fixed': {
      const labelToKey = invertLabels(field.labels);
      const record: Record<string, number> = {};
      for (const line of parseBlock(lines, field.label)) {
        const sepIdx = line.indexOf(': ');
        if (sepIdx === -1) continue;
        const label = line.slice(0, sepIdx).toLowerCase();
        const key = labelToKey[label] ?? (field.keys.includes(line.slice(0, sepIdx)) ? line.slice(0, sepIdx) : undefined);
        const value = parseNumber(line.slice(sepIdx + 2));
        if (key && value != null) record[key] = value;
      }
      return Object.keys(record).length > 0 ? record : undefined;
    }
    case 'record-open': {
      const record: Record<string, number> = {};
      for (const line of parseBlock(lines, field.label)) {
        const sepIdx = line.indexOf(': ');
        if (sepIdx === -1) continue;
        const name = line.slice(0, sepIdx).trim();
        const value = parseNumber(line.slice(sepIdx + 2));
        if (name && value != null) record[name] = value;
      }
      return Object.keys(record).length > 0 ? record : undefined;
    }
    case 'spell-slots': {
      const raw = parseInline(lines, field.label);
      if (!raw) return undefined;
      const record: Record<string, number> = {};
      for (const match of raw.matchAll(/Lv(\w+)\s*x(\d+)/g)) {
        record[match[1]] = parseInt(match[2], 10);
      }
      return Object.keys(record).length > 0 ? record : undefined;
    }
    case 'table': {
      const colLabelToKey = new Map(field.columns.map((c) => [c.label.toLowerCase(), c] as const));
      const rows = parseBlock(lines, field.label)
        .filter((l) => l.startsWith('- '))
        .map((l) => {
          const row: Record<string, unknown> = {};
          for (const part of l.slice(2).split(', ')) {
            const sepIdx = part.indexOf(': ');
            if (sepIdx === -1) continue;
            const col = colLabelToKey.get(part.slice(0, sepIdx).toLowerCase());
            if (!col) continue;
            const raw = part.slice(sepIdx + 2);
            row[col.key] = col.type === 'number' ? parseNumber(raw) : raw;
          }
          return row;
        })
        .filter((row) => Object.keys(row).length > 0);
      return rows.length > 0 ? rows : undefined;
    }
    default:
      return undefined;
  }
}

export function parsePlainTextCharacterSheet(
  gameSystem: string,
  text: string
): ParsedCharacterImport | { error: string } {
  const schema = getSheetSchema(gameSystem);
  if (!schema) return { error: 'Text import is not available for this game system.' };

  const lines = text.split(/\r?\n/);

  // Title line: "Name — System Name". Em dash matches buildPlainTextSheet's
  // own separator exactly; fall back to a plain hyphen for hand-edited files.
  const titleLine = lines[0] ?? '';
  const titleParts = titleLine.split(/\s+—\s+|\s+-\s+/);
  const name = titleParts[0]?.trim() || undefined;

  // "{race} {class} · Level {n}" — race/class order matches the export's
  // own join order. When only one non-level segment is present it's
  // genuinely ambiguous which one it is (a hand-edited file could have
  // either), so neither is guessed in that case — safer than a coin flip.
  const metaLine = lines[3] ?? '';
  const metaParts = metaLine.split(' · ').map((s) => s.trim()).filter(Boolean);
  let level: number | undefined;
  const levelPart = metaParts.find((p) => /^Level \d+$/.test(p));
  if (levelPart) level = parseInt(levelPart.slice(6), 10);
  const nonLevelParts = metaParts.filter((p) => p !== levelPart);
  let race: string | undefined;
  let characterClass: string | undefined;
  if (nonLevelParts.length === 2) {
    [race, characterClass] = nonLevelParts;
  }

  const hpLine = lines.find((l) => l.startsWith('HP: '));
  let hp: number | null | undefined;
  let maxHp: number | null | undefined;
  if (hpLine) {
    const match = hpLine.match(/^HP:\s*(\S+)\s*\/\s*(\S+)/);
    if (match) {
      hp = match[1] === '—' ? undefined : parseNumber(match[1]) ?? undefined;
      maxHp = match[2] === '—' ? undefined : parseNumber(match[2]) ?? undefined;
    }
  }

  const abilityScoreNames = getGameSystem(gameSystem)?.abilityScores ?? [];
  const abilityScores: Record<string, number> = {};
  for (const line of parseBlock(lines, 'Ability Scores')) {
    const sepIdx = line.indexOf(': ');
    if (sepIdx === -1) continue;
    const abilityName = line.slice(0, sepIdx);
    if (!abilityScoreNames.includes(abilityName)) continue;
    const value = parseNumber(line.slice(sepIdx + 2));
    if (value != null) abilityScores[abilityName] = value;
  }

  const stats: Record<string, unknown> = {};
  const combat: Record<string, unknown> = {};
  const saves: Record<string, unknown> = {};
  const skills: Record<string, unknown> = {};
  const columnMap = { stats, combat, saves, skills };

  for (const field of schema.fields) {
    const value = fieldValueFromLines(lines, field);
    if (value !== undefined) columnMap[field.column][field.key] = value;
  }
  if (Object.keys(abilityScores).length > 0) stats.abilityScores = abilityScores;

  const equipment = parseBlock(lines, 'Equipment')
    .filter((l) => l.startsWith('- '))
    .map((l) => {
      const match = l.slice(2).match(/^(.*?)(?:\s+x(\d+))?$/);
      return { name: match?.[1]?.trim() ?? l.slice(2), quantity: match?.[2] ? parseInt(match[2], 10) : undefined };
    })
    .filter((item) => item.name);

  return {
    name,
    race,
    class: characterClass,
    level,
    hp: hp ?? undefined,
    maxHp: maxHp ?? undefined,
    columns: { stats, combat, saves, skills },
    equipment,
  };
}
