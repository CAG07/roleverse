'use client';

import styles from './EditCampaignPage.module.css';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getAllGameSystems } from '@/lib/game-systems/registry';

interface EditCampaignPageProps {
  id: string;
  initialName: string;
  initialDescription: string;
  initialGameSystem: string;
}

export function EditCampaignPage({
  id,
  initialName,
  initialDescription,
  initialGameSystem,
}: EditCampaignPageProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [gameSystem, setGameSystem] = useState(initialGameSystem);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const systems = getAllGameSystems();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Campaign name is required.');
      return;
    }
    if (!gameSystem) {
      setError('Please select a game system.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          game_system: gameSystem,
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.push(`/campaigns/${id}`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.editCampaignRoot}>
      <h1 className={styles.pageTitle}>Edit Campaign</h1>

      <div className={styles.formCard}>
        <p className={styles.formCardTitle}>Campaign Details</p>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>
              Campaign Name *
            </label>
            <input
              id="name"
              className={styles.formInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.formLabel}>
              Description
            </label>
            <textarea
              id="description"
              className={styles.formTextarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Game System *</label>
            <div className={styles.systemGrid}>
              {systems.map((system) => (
                <button
                  key={system.id}
                  type="button"
                  className={`${styles.systemOption}${gameSystem === system.id ? ` ${styles.selected}` : ''}`}
                  onClick={() => setGameSystem(system.id)}
                >
                  <span className={`${styles.corner} ${styles.tl}`} />
                  <span className={`${styles.corner} ${styles.tr}`} />
                  <span className={`${styles.corner} ${styles.bl}`} />
                  <span className={`${styles.corner} ${styles.br}`} />
                  <p className={styles.systemName}>{system.name}</p>
                  <p className={styles.systemDescription}>{system.description}</p>
                </button>
              ))}
            </div>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.formActions}>
            <button type="submit" disabled={loading} className={styles.btnSubmit}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => router.push(`/campaigns/${id}`)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
