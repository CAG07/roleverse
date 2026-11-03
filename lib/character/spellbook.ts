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
  /** Memorized style only: the row key holding the memorized count. 3.5E keeps its
   *  original free-text `prepared` column (3.5E's own word for it), so rows saved
   *  before the Spell Book existed — "Yes", "2" — still read correctly everywhere. */
  memorizedKey: string;
  /** Label for the rest button. */
  restLabel: string;
}

const CONFIGS: Record<string, SpellbookConfig> = {
  ADD1E: { style: 'memorized', spellKey: 'spellbook', memorizedKey: 'memorized', restLabel: 'Rest' },
  ADD2E: { style: 'memorized', spellKey: 'spellbook', memorizedKey: 'memorized', restLabel: 'Rest' },
  '3_5E': { style: 'memorized', spellKey: 'knownSpells', memorizedKey: 'prepared', restLabel: 'Rest' },
  '5E_2014': { style: 'prepared', spellKey: 'knownSpells', memorizedKey: 'memorized', restLabel: 'Long Rest' },
  '5E_2024': { style: 'prepared', spellKey: 'knownSpells', memorizedKey: 'memorized', restLabel: 'Long Rest' },
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

/** A memorized count from a number or free text: "2" → 2, "Yes"/"x" → 1, blank/"no" → 0. */
export function memorizedCount(value: unknown): number {
  const n = toCount(value);
  if (n > 0) return n;
  if (typeof value !== 'string' || !Number.isNaN(Number(value.trim()))) return 0;
  return isPreparedText(value) ? 1 : 0;
}

/** Reads raw table rows into SpellRows. */
export function normalizeSpellRows(
  rows: unknown,
  style: SpellbookStyle,
  memorizedKey = 'memorized'
): SpellRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => {
      const level = Number.isFinite(Number(r.level)) ? Math.max(0, Math.floor(Number(r.level))) : 0;
      const name = typeof r.name === 'string' ? r.name.trim() : String(r.name ?? '').trim();
      const memorized = style === 'memorized' ? memorizedCount(r[memorizedKey]) : 0;
      const cast = Math.min(toCount(r.cast), memorized);
      return { level, name, memorized, cast, prepared: style === 'prepared' && isPreparedText(r.prepared) };
    })
    .filter((r) => r.name.length > 0);
}

/** Back to the stored table shape, matching each style's schema columns. */
export function serializeSpellRows(
  rows: SpellRow[],
  style: SpellbookStyle,
  memorizedKey = 'memorized'
): Record<string, unknown>[] {
  return rows.map((r) =>
    style === 'memorized'
      ? { level: r.level, name: r.name, [memorizedKey]: r.memorized, cast: r.cast }
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
export function formatMemorizedSpellLines(rawRows: unknown, heading: string, memorizedKey = 'memorized'): string[] {
  const rows = normalizeSpellRows(rawRows, 'memorized', memorizedKey);
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
