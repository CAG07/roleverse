'use client';

import styles from './EditCharacterPage.module.css';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { GeneratingIndicator } from '@/components/ui/GeneratingIndicator';
import SystemFields, { buildCharacterColumns, hydrateSystemFieldsValue } from './SystemFields';
import type { SystemFieldsValue } from './SystemFields';

export interface EditCharacterGameData {
  game_data_stats: Record<string, unknown> | null;
  game_data_combat: Record<string, unknown> | null;
  game_data_saves: Record<string, unknown> | null;
  game_data_skills: Record<string, unknown> | null;
}

interface EditCharacterPageProps {
  campaignId: string;
  campaignName: string;
  characterId: string;
  gameSystem: string;
  initialName: string;
  initialRace: string;
  initialClass: string;
  initialLevel: number;
  initialHp: number;
  initialMaxHp: number;
  initialNotes: string;
  initialGameData: EditCharacterGameData;
}

export function EditCharacterPage({
  campaignId,
  campaignName,
  characterId,
  gameSystem,
  initialName,
  initialRace,
  initialClass,
  initialLevel,
  initialHp,
  initialMaxHp,
  initialNotes,
  initialGameData,
}: EditCharacterPageProps) {
  const router = useRouter();
  const isDcc = gameSystem === 'DCC';
  const minLevel = isDcc ? 0 : 1;
  const [name, setName] = useState(initialName);
  const [race, setRace] = useState(initialRace);
  const [characterClass, setCharacterClass] = useState(initialClass);
  const [level, setLevel] = useState(String(initialLevel));
  const [hp, setHp] = useState(String(initialHp));
  const [maxHp, setMaxHp] = useState(String(initialMaxHp));
  const [notes, setNotes] = useState(initialNotes);
  const [systemFields, setSystemFields] = useState<SystemFieldsValue>(() =>
    hydrateSystemFieldsValue(gameSystem, {
      stats: initialGameData.game_data_stats ?? {},
      combat: initialGameData.game_data_combat ?? {},
      saves: initialGameData.game_data_saves ?? {},
      skills: initialGameData.game_data_skills ?? {},
    })
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fillInHint, setFillInHint] = useState('');
  const [fillingIn, setFillingIn] = useState(false);
  const [fillInError, setFillInError] = useState('');

  const handleFillIn = async () => {
    setFillInError('');
    setFillingIn(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/characters/${characterId}/fill-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hint: fillInHint,
          existing: {
            name,
            race,
            class: characterClass,
            level: parseInt(level, 10) || 0,
            hp: parseInt(hp, 10) || 0,
            maxHp: parseInt(maxHp, 10) || 0,
            notes,
            abilityScores: systemFields.abilityScores,
            fields: systemFields.fields,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFillInError(data.error ?? 'AI fill-in failed.');
        return;
      }
      const character = data.character as {
        name: string;
        race: string;
        class: string;
        level: number;
        hp: number;
        maxHp: number;
        notes: string;
        systemFields: { abilityScores: Record<string, string>; fields: SystemFieldsValue['fields'] };
      };
      setName(character.name);
      setRace(character.race);
      setCharacterClass(character.class);
      setLevel(String(character.level));
      setHp(String(character.hp));
      setMaxHp(String(character.maxHp));
      setNotes(character.notes);
      setSystemFields((prev) => ({
        ...prev,
        abilityScores: character.systemFields.abilityScores,
        fields: character.systemFields.fields,
      }));
    } catch {
      setFillInError('AI fill-in failed. Please try again or fill in the remaining fields manually.');
    } finally {
      setFillingIn(false);
    }
  };

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

    if (isNaN(parsedLevel) || parsedLevel < minLevel) {
      setError(`Level must be ${minLevel} or greater.`);
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

      // Fetch the latest raw columns before merging, so an edit made from a form that
      // only knows today's schema keys doesn't clobber keys another concurrent write
      // (another tab, a future feature) added to the same JSONB column.
      const { data: current, error: fetchError } = await supabase
        .from('characters')
        .select('game_data_stats, game_data_combat, game_data_saves, game_data_skills')
        .eq('id', characterId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const built = buildCharacterColumns(gameSystem, systemFields);

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
          game_data_stats: { ...((current?.game_data_stats as Record<string, unknown>) ?? {}), ...built.stats },
          game_data_combat: {
            ...((current?.game_data_combat as Record<string, unknown>) ?? {}),
            ...built.combat,
          },
          game_data_saves: { ...((current?.game_data_saves as Record<string, unknown>) ?? {}), ...built.saves },
          game_data_skills: {
            ...((current?.game_data_skills as Record<string, unknown>) ?? {}),
            ...built.skills,
          },
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

      <div className={styles.generateCard}>
        <p className={styles.formCardTitle}>AI Fill In Missing Fields</p>
        <div className={styles.formRow}>
          <input
            className={styles.formInput}
            value={fillInHint}
            onChange={(e) => setFillInHint(e.target.value)}
            placeholder="Optional guidance, e.g. focus on backstory and personality"
            disabled={fillingIn}
          />
          <button
            type="button"
            className={styles.btnSubmit}
            onClick={() => void handleFillIn()}
            disabled={fillingIn}
          >
            {fillingIn ? 'Filling In…' : 'Fill In Missing Fields'}
          </button>
        </div>
        <p className={styles.hint}>
          Invents values only for blank fields below — anything already filled in is left exactly
          as-is. Review the results before saving.
        </p>
        {fillingIn && <GeneratingIndicator label="Completing this character — this can take up to 30 seconds." />}
        {fillInError && <p className={styles.errorMsg}>{fillInError}</p>}
      </div>

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
                min={minLevel}
                max="30"
                className={styles.formInput}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
              {isDcc && (
                <p className={styles.hint}>Level 0 = funnel character.</p>
              )}
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

          <SystemFields gameSystem={gameSystem} value={systemFields} onChange={setSystemFields} />

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
