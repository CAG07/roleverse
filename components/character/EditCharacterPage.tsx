'use client';

import styles from './EditCharacterPage.module.css';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface EditCharacterPageProps {
  campaignId: string;
  campaignName: string;
  characterId: string;
  initialName: string;
  initialRace: string;
  initialClass: string;
  initialLevel: number;
  initialHp: number;
  initialMaxHp: number;
  initialNotes: string;
}

export function EditCharacterPage({
  campaignId,
  campaignName,
  characterId,
  initialName,
  initialRace,
  initialClass,
  initialLevel,
  initialHp,
  initialMaxHp,
  initialNotes,
}: EditCharacterPageProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [race, setRace] = useState(initialRace);
  const [characterClass, setCharacterClass] = useState(initialClass);
  const [level, setLevel] = useState(String(initialLevel));
  const [hp, setHp] = useState(String(initialHp));
  const [maxHp, setMaxHp] = useState(String(initialMaxHp));
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const { error: updateError } = await supabase
        .from('characters')
        .update({
          name: name.trim(),
          race: race.trim() || null,
          class: characterClass.trim() || null,
          level: parsedLevel,
          hp: parsedHp,
          max_hp: parsedMaxHp,
          notes: notes.trim() || null,
        })
        .eq('id', characterId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.push(`/campaigns/${campaignId}/characters/${characterId}`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.root}>
      <Link
        href={`/campaigns/${campaignId}/characters/${characterId}`}
        className={styles.backLink}
      >
        ← Back to Character
      </Link>

      <h1 className={styles.pageTitle}>Edit Character</h1>
      <p className={styles.subtitle}>{campaignName}</p>

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

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.formActions}>
            <button type="submit" disabled={loading} className={styles.btnSubmit}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
            <Link
              href={`/campaigns/${campaignId}/characters/${characterId}`}
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
