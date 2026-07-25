'use client';

import styles from './page.module.css';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getAllGameSystems } from '@/lib/game-systems/registry';

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [gameSystem, setGameSystem] = useState('');
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be signed in to create a campaign.');
        return;
      }

      const { data, error: insertError } = await supabase
        .from('campaigns')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          module_description: moduleDescription.trim() || null,
          game_system: gameSystem,
          owner_id: user.id,
        })
        .select('id')
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.push(`/campaigns/${data.id}`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.newCampaignRoot}>
      <h1 className={styles.pageTitle}>Create New Campaign</h1>

      <div className={styles.formCard}>
        <p className={styles.formCardTitle}>Campaign Details</p>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>Campaign Name *</label>
            <input
              id="name"
              className={styles.formInput}
              placeholder="e.g., The Lost Mines of Phandelver"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.formLabel}>Description</label>
            <textarea
              id="description"
              className={styles.formTextarea}
              placeholder="A brief overview of your campaign..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="moduleDescription" className={styles.formLabel}>Module &amp; Campaign Info</label>
            <p className={styles.formHint}>
              What module or setting are you running? Note any supplements, player kits, or house rules the GM should know about.
            </p>
            <textarea
              id="moduleDescription"
              className={styles.formTextarea}
              placeholder="e.g., Palace of the Silver Princess (B3), using Tasha's expanded options, no multiclassing — or describe your homebrew adventure and house rules"
              value={moduleDescription}
              onChange={(e) => setModuleDescription(e.target.value)}
              rows={4}
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

          <button type="submit" disabled={loading} className={styles.btnSubmit}>
            {loading ? 'Creating…' : 'Create Campaign'}
          </button>
        </form>
      </div>
    </div>
  );
}
