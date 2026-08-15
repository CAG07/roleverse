'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { GameSystem } from '@/lib/game-systems/types';
import type { WorkshopCategory, WorkshopSubmission } from './WorkshopPage';
import styles from './SubmitResourceForm.module.css';

interface SubmitResourceFormProps {
  categories: { id: WorkshopCategory; label: string }[];
  allSystems: GameSystem[];
  onSubmitted: (submission: WorkshopSubmission) => void;
}

export function SubmitResourceForm({ categories, allSystems, onSubmitted }: SubmitResourceFormProps) {
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<WorkshopCategory>(categories[0].id);
  const [gameSystems, setGameSystems] = useState<string[]>([]);
  const [licenseType, setLicenseType] = useState('');
  const [description, setDescription] = useState('');
  const [creditSubmitter, setCreditSubmitter] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleSystem = (id: string) => {
    setGameSystems((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('A URL is required.');
      return;
    }
    if (!description.trim()) {
      setError('A brief description in your own words is required.');
      return;
    }
    if (!licenseType.trim()) {
      setError('License type is required (e.g. OGL, CC-BY, official/proprietary).');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be signed in to submit a resource.');
        return;
      }

      const { data, error: insertError } = await supabase
        .from('workshop_submissions')
        .insert({
          user_id: user.id,
          url: url.trim(),
          category,
          game_systems: gameSystems,
          license_type: licenseType.trim(),
          description: description.trim(),
          credit_submitter: creditSubmitter,
        })
        .select('id, url, category, game_systems, license_type, description, status, decline_reason, created_at')
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      onSubmitted(data as WorkshopSubmission);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <p className={styles.hint}>
        Submissions are queued for review — they don&apos;t appear in the directory
        automatically. You&apos;ll see the status below once it&apos;s reviewed.
      </p>

      <div className={styles.formGroup}>
        <label htmlFor="resourceUrl" className={styles.formLabel}>
          URL *
        </label>
        <input
          id="resourceUrl"
          type="url"
          className={styles.formInput}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="resourceCategory" className={styles.formLabel}>
          Category *
        </label>
        <select
          id="resourceCategory"
          className={styles.formInput}
          value={category}
          onChange={(e) => setCategory(e.target.value as WorkshopCategory)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Game Systems</label>
        <div className={styles.systemGrid}>
          {allSystems.map((s) => (
            <label key={s.id} className={styles.systemCheckbox}>
              <input
                type="checkbox"
                checked={gameSystems.includes(s.id)}
                onChange={() => toggleSystem(s.id)}
              />
              {s.name}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="licenseType" className={styles.formLabel}>
          License Type *
        </label>
        <input
          id="licenseType"
          className={styles.formInput}
          value={licenseType}
          onChange={(e) => setLicenseType(e.target.value)}
          placeholder="e.g. OGL, CC-BY, official publisher site"
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="resourceDescription" className={styles.formLabel}>
          Description (in your own words) *
        </label>
        <textarea
          id="resourceDescription"
          className={styles.formTextarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          required
        />
      </div>

      <label className={styles.creditCheckbox}>
        <input
          type="checkbox"
          checked={creditSubmitter}
          onChange={(e) => setCreditSubmitter(e.target.checked)}
        />
        Credit me as the submitter if this is added
      </label>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <button type="submit" disabled={loading} className={styles.btnSubmit}>
        {loading ? 'Submitting…' : 'Submit for Review'}
      </button>
    </form>
  );
}
