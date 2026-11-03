'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import styles from './SpellBook.module.css';
import { updateCharacterGameDataKey } from '@/lib/characters/character-updates';
import { useCharacterDataUpdate } from '@/lib/characters/character-data-update-context';
import {
  SPELL_SLOTS_EXPENDED_KEY,
  expendedByLevel,
  getSpellbookConfig,
  memorizedByLevel,
  normalizeSpellRows,
  restRows,
  serializeSpellRows,
  slotTotalsByLevel,
  spellLevels,
  type SpellRow,
} from '@/lib/character/spellbook';

interface SpellBookProps {
  characterId: string;
  gameSystem: string;
  /** Assembled sheet data (all JSONB columns spread flat). */
  data: Record<string, unknown>;
}

const COLUMN = 'game_data_combat' as const;

function levelHeading(level: number, style: 'memorized' | 'prepared'): string {
  if (level === 0) return style === 'prepared' ? 'Cantrips' : 'Level 0';
  return `Level ${level}`;
}

/**
 * Live spell book on the character sheet: memorize (AD&D/3.5E) or prepare (5E) spells,
 * mark them cast, and rest. Saves straight to game_data_combat — one key per change —
 * and tells the host page through CharacterDataUpdateContext.
 */
export default function SpellBook({ characterId, gameSystem, data }: SpellBookProps) {
  const config = getSpellbookConfig(gameSystem);
  const style = config?.style ?? 'memorized';
  const spellKey = config?.spellKey ?? '';
  const notifyHost = useCharacterDataUpdate();

  const sourceRows = data[spellKey];
  const sourceExpended = data[SPELL_SLOTS_EXPENDED_KEY];
  const totals = slotTotalsByLevel(gameSystem, data);

  const [rows, setRows] = useState<SpellRow[]>(() => normalizeSpellRows(sourceRows, style));
  const [expended, setExpended] = useState<Record<number, number>>(() => expendedByLevel(sourceExpended, totals));
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [newLevel, setNewLevel] = useState(style === 'prepared' ? '0' : '1');
  const [newName, setNewName] = useState('');

  // Re-sync from props when the host page hands over fresher data — but never while a
  // save is in flight, so a refresh that lands mid-click can't roll back local edits.
  const sourceSignature = JSON.stringify([sourceRows ?? null, sourceExpended ?? null]);
  const [syncedSignature, setSyncedSignature] = useState(sourceSignature);
  if (sourceSignature !== syncedSignature && pending === 0) {
    setSyncedSignature(sourceSignature);
    setRows(normalizeSpellRows(sourceRows, style));
    setExpended(expendedByLevel(sourceExpended, totals));
  }

  // Saves run one at a time so a slow early write can't land after a later one.
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  function persist(key: string, value: unknown, revert: () => void) {
    setPending((n) => n + 1);
    setError(null);
    saveQueue.current = saveQueue.current
      .then(() => updateCharacterGameDataKey(characterId, COLUMN, key, value))
      .then(() => notifyHost?.(characterId, COLUMN, key, value))
      .catch(() => {
        revert();
        setError('The spell book could not be saved. Please try again.');
      })
      .finally(() => setPending((n) => n - 1));
  }

  function commitRows(next: SpellRow[]) {
    const previous = rows;
    setRows(next);
    persist(spellKey, serializeSpellRows(next, style), () => setRows(previous));
  }

  function commitExpended(next: Record<number, number>) {
    const previous = expended;
    setExpended(next);
    persist(SPELL_SLOTS_EXPENDED_KEY, next, () => setExpended(previous));
  }

  if (!config) return null;

  const levels = spellLevels(rows, totals);
  if (levels.length === 0 && rows.length === 0) return null;

  const memorizedTotals = memorizedByLevel(rows);
  const canRest =
    style === 'memorized' ? rows.some((r) => r.cast > 0) : Object.values(expended).some((n) => n > 0);

  function updateRow(index: number, patch: Partial<SpellRow>) {
    commitRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    commitRows(rows.filter((_, i) => i !== index));
  }

  function handleRest() {
    if (style === 'memorized') commitRows(restRows(rows));
    else commitExpended({});
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    const level = Math.max(0, Math.floor(Number(newLevel)));
    if (!name || !Number.isFinite(level)) return;
    commitRows([...rows, { level, name, memorized: 0, cast: 0, prepared: false }]);
    setNewName('');
  }

  function toggleSlot(level: number, slotIndex: number) {
    const used = expended[level] ?? 0;
    const nextUsed = slotIndex < used ? slotIndex : slotIndex + 1;
    const next = { ...expended };
    if (nextUsed > 0) next[level] = nextUsed;
    else delete next[level];
    commitExpended(next);
  }

  return (
    <section className={styles.spellBook} aria-label="Spell Book">
      <div className={styles.titleRow}>
        <div className={styles.sectionLabel}>Spell Book</div>
        <button
          type="button"
          className={styles.restButton}
          onClick={handleRest}
          disabled={!canRest}
          aria-label={
            style === 'memorized'
              ? `${config.restLabel}: restore every cast spell`
              : `${config.restLabel}: restore every expended spell slot`
          }
        >
          {config.restLabel}
        </button>
      </div>

      {levels.map((level) => {
        const levelRows = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.level === level);
        const slots = totals[level] ?? 0;
        const memorized = memorizedTotals[level] ?? 0;
        const used = expended[level] ?? 0;
        const over = style === 'memorized' && slots > 0 && memorized > slots;

        return (
          <div key={level} className={styles.level}>
            <div className={styles.levelHeader}>
              <span className={styles.levelName}>{levelHeading(level, style)}</span>
              {style === 'memorized' && slots > 0 && (
                <span className={`${styles.levelCount}${over ? ` ${styles.over}` : ''}`}>
                  Memorized {memorized} of {slots}
                  {over && ' (more than this level’s slots)'}
                </span>
              )}
              {style === 'prepared' && slots > 0 && (
                <span className={styles.slotPips}>
                  <span className={styles.levelCount}>
                    Slots {slots - used} of {slots} left
                  </span>
                  {Array.from({ length: slots }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`${styles.pip}${i < used ? ` ${styles.pipUsed}` : ''}`}
                      onClick={() => toggleSlot(level, i)}
                      aria-pressed={i < used}
                      aria-label={`${levelHeading(level, style)} spell slot ${i + 1} of ${slots}${
                        i < used ? ', expended' : ', available'
                      }`}
                    />
                  ))}
                </span>
              )}
            </div>

            {levelRows.length === 0 ? (
              <p className={styles.empty}>No spells recorded at this level yet.</p>
            ) : (
              <ul className={styles.spellList}>
                {levelRows.map(({ row, index }) => (
                  <li key={`${row.name}-${index}`} className={styles.spell}>
                    <span
                      className={`${styles.spellName}${
                        style === 'memorized' && row.memorized > 0 && row.cast >= row.memorized ? ` ${styles.spent}` : ''
                      }`}
                    >
                      {row.name}
                    </span>

                    {style === 'memorized' ? (
                      <span className={styles.controls}>
                        <span className={styles.stepper}>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => updateRow(index, { memorized: row.memorized - 1, cast: Math.min(row.cast, row.memorized - 1) })}
                            disabled={row.memorized === 0}
                            aria-label={`Memorize ${row.name} one time fewer`}
                          >
                            <Minus size={12} aria-hidden="true" />
                          </button>
                          <span className={styles.count}>{row.memorized}</span>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => updateRow(index, { memorized: row.memorized + 1 })}
                            aria-label={`Memorize ${row.name} one more time`}
                          >
                            <Plus size={12} aria-hidden="true" />
                          </button>
                        </span>
                        {row.memorized > 0 && (
                          <span className={styles.castPips}>
                            {Array.from({ length: row.memorized }, (_, i) => (
                              <button
                                key={i}
                                type="button"
                                className={`${styles.pip}${i < row.cast ? ` ${styles.pipUsed}` : ''}`}
                                onClick={() => updateRow(index, { cast: i < row.cast ? i : i + 1 })}
                                aria-pressed={i < row.cast}
                                aria-label={`${row.name}, memorized copy ${i + 1} of ${row.memorized}${
                                  i < row.cast ? ', cast' : ', ready'
                                }`}
                              />
                            ))}
                          </span>
                        )}
                      </span>
                    ) : row.level === 0 ? (
                      <span className={styles.atWill}>At will</span>
                    ) : (
                      <button
                        type="button"
                        className={`${styles.prepareButton}${row.prepared ? ` ${styles.prepared}` : ''}`}
                        onClick={() => updateRow(index, { prepared: !row.prepared })}
                        aria-pressed={row.prepared}
                        aria-label={`${row.name}: ${row.prepared ? 'prepared' : 'not prepared'}`}
                      >
                        {row.prepared ? 'Prepared' : 'Not prepared'}
                      </button>
                    )}

                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => removeRow(index)}
                      aria-label={`Remove ${row.name} from the spell book`}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <form className={styles.addForm} onSubmit={handleAdd}>
        <label className={styles.addLabel}>
          Level
          <input
            type="number"
            min={0}
            max={10}
            className={styles.levelInput}
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
          />
        </label>
        <label className={`${styles.addLabel} ${styles.nameLabel}`}>
          Spell
          <input
            type="text"
            className={styles.nameInput}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Spell name"
          />
        </label>
        <button type="submit" className={styles.addButton} disabled={newName.trim().length === 0}>
          Add Spell
        </button>
      </form>

      <p className={styles.error} role="status" aria-live="polite">
        {error}
      </p>
    </section>
  );
}
