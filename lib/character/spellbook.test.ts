import { describe, expect, it } from 'vitest';
import {
  expendedByLevel,
  formatMemorizedSpellLines,
  getSpellbookConfig,
  isPreparedText,
  memorizedByLevel,
  normalizeSpellRows,
  restRows,
  serializeSpellRows,
  slotTotalsByLevel,
  spellLevels,
} from './spellbook';

describe('getSpellbookConfig', () => {
  it('uses the memorized style for AD&D and 3.5E, prepared for 5E', () => {
    expect(getSpellbookConfig('ADD1E')).toMatchObject({ style: 'memorized', spellKey: 'spellbook' });
    expect(getSpellbookConfig('3_5E')).toMatchObject({ style: 'memorized', spellKey: 'knownSpells' });
    expect(getSpellbookConfig('5E_2024')).toMatchObject({ style: 'prepared', spellKey: 'knownSpells' });
  });

  it('has no spell book for other systems', () => {
    expect(getSpellbookConfig('DCC')).toBeNull();
    expect(getSpellbookConfig('PATHFINDER_2E')).toBeNull();
  });
});

describe('isPreparedText', () => {
  it('treats yes-like text as prepared and blanks/negatives as not', () => {
    for (const v of ['Yes', 'x', '✓', 'P', true]) expect(isPreparedText(v)).toBe(true);
    for (const v of ['', ' ', 'no', 'No', 'false', '0', '-', '—', undefined, null]) expect(isPreparedText(v)).toBe(false);
  });
});

describe('normalizeSpellRows', () => {
  it('reads AD&D rows and clamps cast to memorized', () => {
    const rows = normalizeSpellRows(
      [
        { level: 1, name: 'Sleep', memorized: 2, cast: 5 },
        { level: 1, name: '  Magic Missile ', memorized: '1' },
        { level: 2, name: '' },
        'junk',
      ],
      'memorized'
    );
    expect(rows).toEqual([
      { level: 1, name: 'Sleep', memorized: 2, cast: 2, prepared: false },
      { level: 1, name: 'Magic Missile', memorized: 1, cast: 0, prepared: false },
    ]);
  });

  it('reads legacy 3.5E free-text prepared values as memorized copies', () => {
    const rows = normalizeSpellRows(
      [
        { level: 1, name: 'Shield', prepared: '2' },
        { level: 1, name: 'Grease', prepared: 'Yes' },
        { level: 2, name: 'Web', prepared: 'no' },
      ],
      'memorized'
    );
    expect(rows.map((r) => r.memorized)).toEqual([2, 1, 0]);
  });

  it('reads 5E prepared text', () => {
    const rows = normalizeSpellRows(
      [
        { level: 0, name: 'Fire Bolt' },
        { level: 1, name: 'Shield', prepared: 'Yes' },
      ],
      'prepared'
    );
    expect(rows.map((r) => r.prepared)).toEqual([false, true]);
  });
});

describe('serializeSpellRows', () => {
  it('writes each style in its schema shape', () => {
    const row = { level: 1, name: 'Sleep', memorized: 2, cast: 1, prepared: true };
    expect(serializeSpellRows([row], 'memorized')).toEqual([{ level: 1, name: 'Sleep', memorized: 2, cast: 1 }]);
    expect(serializeSpellRows([row], 'prepared')).toEqual([{ level: 1, name: 'Sleep', prepared: 'Yes' }]);
    expect(serializeSpellRows([{ ...row, prepared: false }], 'prepared')).toEqual([{ level: 1, name: 'Sleep' }]);
  });
});

describe('slotTotalsByLevel', () => {
  it('reads the spellSlots record and skips empty levels', () => {
    expect(slotTotalsByLevel('ADD1E', { spellSlots: { '1': 4, '2': 2, '3': 0 } })).toEqual({ 1: 4, 2: 2 });
    expect(slotTotalsByLevel('5E_2014', {})).toEqual({});
  });

  it('adds per-day and bonus spells for 3.5E', () => {
    expect(
      slotTotalsByLevel('3_5E', {
        spellsPerDay: [
          { level: 0, perDay: 4 },
          { level: 1, perDay: 2, bonusSpells: 1 },
        ],
      })
    ).toEqual({ 0: 4, 1: 3 });
  });
});

describe('expendedByLevel', () => {
  it('clamps to available slots', () => {
    expect(expendedByLevel({ '1': 5, '2': 1, '9': 1 }, { 1: 4, 2: 3 })).toEqual({ 1: 4, 2: 1 });
    expect(expendedByLevel(undefined, { 1: 2 })).toEqual({});
  });
});

describe('formatMemorizedSpellLines', () => {
  it('lists spells by level with memorized and cast counts', () => {
    expect(
      formatMemorizedSpellLines(
        [
          { level: 2, name: 'Web', memorized: 0 },
          { level: 1, name: 'Sleep', memorized: 2, cast: 1 },
          { level: 1, name: 'Shield', prepared: 'Yes' },
        ],
        'Spell Book'
      )
    ).toEqual([
      'Spell Book:',
      '  - Level 1: Sleep (memorized 2, cast 1)',
      '  - Level 1: Shield (memorized 1)',
      '  - Level 2: Web',
    ]);
    expect(formatMemorizedSpellLines(undefined, 'Spell Book')).toEqual([]);
  });
});

describe('level helpers', () => {
  const rows = normalizeSpellRows(
    [
      { level: 1, name: 'Sleep', memorized: 2, cast: 1 },
      { level: 1, name: 'Shield', memorized: 1 },
      { level: 3, name: 'Fireball', memorized: 0 },
    ],
    'memorized'
  );

  it('totals memorized copies per level', () => {
    expect(memorizedByLevel(rows)).toEqual({ 1: 3, 3: 0 });
  });

  it('lists levels with spells or slots', () => {
    expect(spellLevels(rows, { 1: 3, 2: 2 })).toEqual([1, 2, 3]);
  });

  it('rest restores cast copies but keeps memorized', () => {
    expect(restRows(rows).map((r) => [r.memorized, r.cast])).toEqual([
      [2, 0],
      [1, 0],
      [0, 0],
    ]);
  });
});
