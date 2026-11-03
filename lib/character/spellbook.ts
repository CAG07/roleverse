// Spell book logic shared by the D&D sheets' live Spell Book panel
// (components/character/SpellBook.tsx). Pure functions only — no React, no I/O.
//
// Two casting styles:
// - "memorized" (Vancian: AD&D 1E/2E, 3.5E) — a spell is memorized some number of
//   times; casting it uses up one memorized copy until the character rests.
// - "prepared" (5E 2014/2024) — a spell is either prepared or not; casting spends a
//   slot of that level, so "cast" is tracked per slot level, not per spell.
//
// Everything lives in game_data_combat. Spell rows are a schema `table` field (so the
// Edit page can edit them generically); the 5E expended-slot tracker is a non-schema key
// (`spellSlotsExpended`), the same way DCC keeps `currentLuck` out of the schema.

export type SpellbookStyle = 'memorized' | 'prepared';

export interface SpellbookConfig {
  style: SpellbookStyle;
  /** Key of the spell-row table field in the system's sheet schema. */
  spellKey: string;
  /** Label for the rest button. */
  restLabel: string;
}

const CONFIGS: Record<string, SpellbookConfig> = {
  ADD1E: { style: 'memorized', spellKey: 'spellbook', restLabel: 'Rest' },
  ADD2E: { style: 'memorized', spellKey: 'spellbook', restLabel: 'Rest' },
  '3_5E': { style: 'memorized', spellKey: 'knownSpells', restLabel: 'Rest' },
  '5E_2014': { style: 'prepared', spellKey: 'knownSpells', restLabel: 'Long Rest' },
  '5E_2024': { style: 'prepared', spellKey: 'knownSpells', restLabel: 'Long Rest' },
};

export const SPELL_SLOTS_KEY = 'spellSlots';
export const SPELL_SLOTS_EXPENDED_KEY = 'spellSlotsExpended';

export function getSpellbookConfig(gameSystem: string): SpellbookConfig | null {
  return CONFIGS[gameSystem] ?? null;
}

/** One spell in the book, normalized. `memorized`/`cast` are only meaningful for the
 *  memorized style, `prepared` only for the prepared style. */
export interface SpellRow {
  level: number;
  name: string;
  memorized: number;
  cast: number;
  prepared: boolean;
}

const NOT_PREPARED = new Set(['', 'no', 'n', 'false', '0', '-', '—', '–']);

function toCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Free-text "Prepared" values from the generic table editor ("Yes", "x", "✓") count as
 *  prepared; blanks and explicit negatives don't. */
export function isPreparedText(value: unknown): boolean {
  if (value === true) return true;
  if (value === undefined || value === null || value === false) return false;
  return !NOT_PREPARED.has(String(value).trim().toLowerCase());
}

/**
 * Reads raw table rows into SpellRows. For the memorized style, a row saved before the
 * Memorized column existed (3.5E's old free-text `prepared`) is read as a count when it
 * is numeric, otherwise as 1 copy when it is any "yes"-like text.
 */
export function normalizeSpellRows(rows: unknown, style: SpellbookStyle): SpellRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => {
      const level = Number.isFinite(Number(r.level)) ? Math.max(0, Math.floor(Number(r.level))) : 0;
      const name = typeof r.name === 'string' ? r.name.trim() : String(r.name ?? '').trim();
      let memorized = toCount(r.memorized);
      if (style === 'memorized' && r.memorized === undefined && r.prepared !== undefined) {
        memorized = toCount(r.prepared) || (isPreparedText(r.prepared) ? 1 : 0);
      }
      const cast = Math.min(toCount(r.cast), memorized);
      return { level, name, memorized, cast, prepared: isPreparedText(r.prepared) };
    })
    .filter((r) => r.name.length > 0);
}

/** Back to the stored table shape, matching each style's schema columns. */
export function serializeSpellRows(rows: SpellRow[], style: SpellbookStyle): Record<string, unknown>[] {
  return rows.map((r) =>
    style === 'memorized'
      ? { level: r.level, name: r.name, memorized: r.memorized, cast: r.cast }
      : { level: r.level, name: r.name, ...(r.prepared ? { prepared: 'Yes' } : {}) }
  );
}

/** Slots per spell level. 3.5E keeps them in its spellsPerDay table
 *  (per-day plus bonus spells); everyone else in the `spellSlots` record. */
export function slotTotalsByLevel(gameSystem: string, data: Record<string, unknown>): Record<number, number> {
  const totals: Record<number, number> = {};
  if (gameSystem === '3_5E') {
    const rows = Array.isArray(data.spellsPerDay) ? (data.spellsPerDay as Record<string, unknown>[]) : [];
    for (const row of rows) {
      const level = Number(row.level);
      if (!Number.isFinite(level)) continue;
      const total = toCount(row.perDay) + toCount(row.bonusSpells);
      if (total > 0) totals[level] = (totals[level] ?? 0) + total;
    }
    return totals;
  }
  const record = data[SPELL_SLOTS_KEY];
  if (record && typeof record === 'object') {
    for (const [lvl, count] of Object.entries(record as Record<string, unknown>)) {
      const level = Number(lvl);
      const total = toCount(count);
      if (Number.isFinite(level) && total > 0) totals[level] = total;
    }
  }
  return totals;
}

/** Expended 5E slots per level, clamped to what's available. */
export function expendedByLevel(raw: unknown, totals: Record<number, number>): Record<number, number> {
  const out: Record<number, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [lvl, count] of Object.entries(raw as Record<string, unknown>)) {
    const level = Number(lvl);
    const used = Math.min(toCount(count), totals[level] ?? 0);
    if (Number.isFinite(level) && used > 0) out[level] = used;
  }
  return out;
}

export function memorizedByLevel(rows: SpellRow[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const r of rows) out[r.level] = (out[r.level] ?? 0) + r.memorized;
  return out;
}

/** Every spell level that has either spells or slots, ascending. */
export function spellLevels(rows: SpellRow[], totals: Record<number, number>): number[] {
  const levels = new Set<number>([...rows.map((r) => r.level), ...Object.keys(totals).map(Number)]);
  return [...levels].sort((a, b) => a - b);
}

/** Plain-text lines for the Fantasy Grounds <notes> fold (memorized style). */
export function formatMemorizedSpellLines(rawRows: unknown, heading: string): string[] {
  const rows = normalizeSpellRows(rawRows, 'memorized');
  if (rows.length === 0) return [];
  return [
    `${heading}:`,
    ...[...rows]
      .sort((a, b) => a.level - b.level)
      .map(
        (r) =>
          `  - Level ${r.level}: ${r.name}${r.memorized > 0 ? ` (memorized ${r.memorized}${r.cast > 0 ? `, cast ${r.cast}` : ''})` : ''}`
      ),
  ];
}

/** Resting restores every cast copy; the memorized spells stay memorized. */
export function restRows(rows: SpellRow[]): SpellRow[] {
  return rows.map((r) => (r.cast === 0 ? r : { ...r, cast: 0 }));
}
