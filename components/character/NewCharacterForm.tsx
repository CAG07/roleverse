'use client';

import styles from './NewCharacterForm.module.css';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import DCCFields, { DCC_FIELDS_DEFAULT } from './DCCFields';
import type { DCCFieldsValue } from './DCCFields';

interface NewCharacterFormProps {
  campaignId: string;
  campaignName: string;
  gameSystem: string;
  gameSystemName: string;
}

function parseDccGameDataStats(f: DCCFieldsValue): Record<string, unknown> {
  const corruption = f.corruptionText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const mercurialMagic = f.mercurialMagicText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx === -1) return { spell: line, effect: '' };
      return { spell: line.slice(0, idx).trim(), effect: line.slice(idx + 1).trim() };
    });

  const stats: Record<string, unknown> = {
    occupation: f.occupation.trim(),
    luckySign: f.luckySign.trim(),
    alignment: f.alignment,
    currentLuck: parseInt(f.currentLuck, 10) || 0,
    startingLuck: parseInt(f.startingLuck, 10) || 0,
  };
  if (f.deedDie.trim()) stats.deedDie = f.deedDie.trim();
  if (f.disapprovalRange.trim()) {
    const n = parseInt(f.disapprovalRange, 10);
    if (!Number.isNaN(n)) stats.disapprovalRange = n;
  }
  if (corruption.length > 0) stats.corruption = corruption;
  if (mercurialMagic.length > 0) stats.mercurialMagic = mercurialMagic;
  return stats;
}

export function NewCharacterForm({
  campaignId,
  campaignName,
  gameSystem,
  gameSystemName,
}: NewCharacterFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [race, setRace] = useState('');
  const [characterClass, setCharacterClass] = useState('');
  const [level, setLevel] = useState('1');
  const [hp, setHp] = useState('0');
  const [maxHp, setMaxHp] = useState('0');
  const [notes, setNotes] = useState('');
  const [dccFields, setDccFields] = useState<DCCFieldsValue>(DCC_FIELDS_DEFAULT);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDcc = gameSystem === 'DCC';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Character name is required.');
      return;
    }

    const parsedLevel = parseInt(level, 10);
    const parsedHp = parseInt(hp, 10);
    const parsedMaxHp = parseInt(maxHp, 10);

    if (isNaN(parsedLevel) || parsedLevel < 1) {
      setError('Level must be a positive number.');
      return;
    }
    if (isNaN(parsedHp) || parsedHp < 0) {
      setError('HP must be 0 or greater.');
      return;
    }
    if (isNaN(parsedMaxHp) || parsedMaxHp < 0) {
      setError('Max HP must be 0 or greater.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in to create a character.');
        return;
      }

      const { data: character, error: insertError } = await supabase
        .from('characters')
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          name: name.trim(),
          race: race.trim() || null,
          class: characterClass.trim() || null,
          level: parsedLevel,
          hp: parsedHp,
          max_hp: parsedMaxHp,
          notes: notes.trim() || null,
          game_data_stats: isDcc ? parseDccGameDataStats(dccFields) : {},
        })
        .select('id')
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.push(`/campaigns/${campaignId}/characters/${character.id}`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.root}>
      <Link href={`/campaigns/${campaignId}/characters`} className={styles.backLink}>
        ← Back to Characters
      </Link>

      <h1 className={styles.pageTitle}>New Character</h1>
      <p className={styles.subtitle}>
        {campaignName} · {gameSystemName}
      </p>

      <div className={styles.formCard}>
        <p className={styles.formCardTitle}>Character Details</p>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>
              Character Name *
            </label>
            <input
              id="name"
              className={styles.formInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aldric Stonebrow"
              required
            />
          </div>

          <div className={styles.formRow}>
            <div>
              <label htmlFor="race" className={styles.formLabel}>
                Race / Ancestry
              </label>
              <input
                id="race"
                className={styles.formInput}
                value={race}
                onChange={(e) => setRace(e.target.value)}
                placeholder="e.g. Human"
              />
            </div>
            <div>
              <label htmlFor="class" className={styles.formLabel}>
                Class
              </label>
              <input
                id="class"
                className={styles.formInput}
                value={characterClass}
                onChange={(e) => setCharacterClass(e.target.value)}
                placeholder="e.g. Fighter"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div>
              <label htmlFor="level" className={styles.formLabel}>
                Level
              </label>
              <input
                id="level"
                type="number"
                min="1"
                max="30"
                className={styles.formInput}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
            </div>
            <div>
              {/* intentionally empty — cosmetic balance */}
            </div>
          </div>

          <div className={styles.formRow}>
            <div>
              <label htmlFor="hp" className={styles.formLabel}>
                Current HP
              </label>
              <input
                id="hp"
                type="number"
                min="0"
                className={styles.formInput}
                value={hp}
                onChange={(e) => setHp(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="maxHp" className={styles.formLabel}>
                Max HP
              </label>
              <input
                id="maxHp"
                type="number"
                min="0"
                className={styles.formInput}
                value={maxHp}
                onChange={(e) => setMaxHp(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="notes" className={styles.formLabel}>
              Notes
            </label>
            <textarea
              id="notes"
              className={styles.formTextarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Background, personality traits, or other notes…"
            />
          </div>

          {isDcc && <DCCFields value={dccFields} onChange={setDccFields} />}

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.formActions}>
            <button type="submit" disabled={loading} className={styles.btnSubmit}>
              {loading ? 'Creating…' : 'Create Character'}
            </button>
            <Link
              href={`/campaigns/${campaignId}/characters`}
              className={styles.btnCancel}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
