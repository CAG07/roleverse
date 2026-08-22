/*
 * IMPORTANT: This component uses CSS Modules (not styled-jsx) intentionally.
 * Do NOT convert this file back to styled-jsx or inline styles.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GeneratingIndicator } from '@/components/ui/GeneratingIndicator';
import styles from './NpcForm.module.css';
import type { Npc, NpcDisposition, NpcInput } from '@/lib/types/npc';

interface NpcFormProps {
  campaignId: string;
  campaignName: string;
  npc?: Npc; // if provided, editing; otherwise creating
}

const DISPOSITION_OPTIONS: { value: NpcDisposition; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'helpful', label: 'Helpful' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'wary', label: 'Wary' },
  { value: 'hostile', label: 'Hostile' },
];

export function NpcForm({ campaignId, campaignName, npc }: NpcFormProps) {
  const router = useRouter();
  const isEditing = !!npc;

  const [fields, setFields] = useState<NpcInput>({
    name: npc?.name ?? '',
    race: npc?.race ?? '',
    occupation: npc?.occupation ?? '',
    description: npc?.description ?? '',
    personality: npc?.personality ?? '',
    voice_notes: npc?.voice_notes ?? '',
    disposition: npc?.disposition ?? 'neutral',
    current_location: npc?.current_location ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateHint, setGenerateHint] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerateError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/npcs/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint: generateHint }),
      });
      const data = await res.json().catch(() => ({ error: 'Request failed' }));
      if (!res.ok) {
        setGenerateError((data as { error?: string }).error ?? 'NPC generation failed.');
        return;
      }
      const generated = (data as { npc: NpcInput }).npc;
      setFields((prev) => ({ ...prev, ...generated }));
    } catch {
      setGenerateError('NPC generation failed. Please try again or fill in the form manually.');
    } finally {
      setGenerating(false);
    }
  };

  const set = (key: keyof NpcInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fields.name.trim()) {
      setError('Name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: NpcInput = {
        name: fields.name.trim(),
        race: fields.race?.trim() || null,
        occupation: fields.occupation?.trim() || null,
        description: fields.description?.trim() || null,
        personality: fields.personality?.trim() || null,
        voice_notes: fields.voice_notes?.trim() || null,
        disposition: fields.disposition ?? 'neutral',
        current_location: fields.current_location?.trim() || null,
      };

      const url = isEditing
        ? `/api/campaigns/${campaignId}/npcs/${npc!.id}`
        : `/api/campaigns/${campaignId}/npcs`;
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        setError((data as { error?: string }).error ?? 'Request failed');
        return;
      }

      const data = await res.json() as { npc: Npc };
      router.push(`/campaigns/${campaignId}/npcs/${data.npc.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.root}>
      <Link href={`/campaigns/${campaignId}/npcs`} className={styles.backLink}>
        ← Back to NPCs
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>{isEditing ? `Edit ${npc!.name}` : 'Add NPC'}</h1>
        <p className={styles.subtitle}>{campaignName}</p>
      </div>

      {!isEditing && (
        <div className={styles.generateCard}>
          <p className={styles.generateTitle}>Generate Premade NPC</p>
          <div className={styles.generateRow}>
            <input
              className={styles.input}
              value={generateHint}
              onChange={(e) => setGenerateHint(e.target.value)}
              placeholder="e.g. a suspicious dockside merchant (optional)"
              disabled={generating}
            />
            <button
              type="button"
              className={styles.btnSubmit}
              onClick={() => void handleGenerate()}
              disabled={generating}
            >
              {generating ? 'Generating…' : 'Generate Premade NPC'}
            </button>
          </div>
          {generating && <GeneratingIndicator label="Generating a full NPC — this can take up to 30 seconds." />}
          {generateError && <p className={styles.errorMsg}>{generateError}</p>}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className={styles.formCard}>
        <div className={styles.formGrid}>
          <label className={styles.fieldLabel}>
            Name <span className={styles.required}>*</span>
            <input
              className={styles.input}
              value={fields.name}
              onChange={set('name')}
              placeholder="Rosie Greenhill"
              disabled={submitting}
              required
            />
          </label>

          <label className={styles.fieldLabel}>
            Race
            <input
              className={styles.input}
              value={fields.race ?? ''}
              onChange={set('race')}
              placeholder="Halfling"
              disabled={submitting}
            />
          </label>

          <label className={styles.fieldLabel}>
            Occupation
            <input
              className={styles.input}
              value={fields.occupation ?? ''}
              onChange={set('occupation')}
              placeholder="Merchant"
              disabled={submitting}
            />
          </label>

          <label className={styles.fieldLabel}>
            Disposition
            <select
              className={styles.select}
              value={fields.disposition ?? 'neutral'}
              onChange={set('disposition')}
              disabled={submitting}
            >
              {DISPOSITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.fieldLabel}>
          Current Location
          <input
            className={styles.input}
            value={fields.current_location ?? ''}
            onChange={set('current_location')}
            placeholder="The Rusty Anchor Inn"
            disabled={submitting}
          />
        </label>

        <label className={styles.fieldLabel}>
          Description
          <textarea
            className={styles.textarea}
            value={fields.description ?? ''}
            onChange={set('description')}
            placeholder="Physical appearance and general impression…"
            rows={3}
            disabled={submitting}
          />
        </label>

        <label className={styles.fieldLabel}>
          Personality
          <textarea
            className={styles.textarea}
            value={fields.personality ?? ''}
            onChange={set('personality')}
            placeholder="How this NPC behaves, their quirks, motivations…"
            rows={3}
            disabled={submitting}
          />
        </label>

        <label className={styles.fieldLabel}>
          Voice Notes
          <textarea
            className={styles.textarea}
            value={fields.voice_notes ?? ''}
            onChange={set('voice_notes')}
            placeholder="Speech patterns, accent, catchphrases…"
            rows={2}
            disabled={submitting}
          />
        </label>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <div className={styles.formActions}>
          <button type="submit" className={styles.btnSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Add NPC'}
          </button>
          <Link href={`/campaigns/${campaignId}/npcs`} className={styles.btnCancel}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
