/*
 * IMPORTANT: This component uses CSS Modules (not styled-jsx) intentionally.
 * Do NOT convert this file back to styled-jsx or inline styles.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './NpcDetailPage.module.css';
import type { Npc, NpcDisposition, NpcKnownFact, NpcSource } from '@/lib/types/npc';

interface NpcDetailPageProps {
  campaignId: string;
  campaignName: string;
  npc: Npc;
}

const DISPOSITION_LABELS: Record<NpcDisposition, string> = {
  friendly: 'Friendly',
  helpful: 'Helpful',
  neutral: 'Neutral',
  wary: 'Wary',
  hostile: 'Hostile',
};

const SOURCE_LABELS: Record<NpcSource, string> = {
  manual: 'Manual',
  extracted: 'Extracted',
  imported: 'Imported',
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function NpcDetailPage({ campaignId, campaignName, npc }: NpcDetailPageProps) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/npcs/${npc.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Delete failed' }));
        setDeleteError((data as { error?: string }).error ?? 'Delete failed');
        return;
      }
      router.push(`/campaigns/${campaignId}/npcs`);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleDeleteFact = async (factIndex: number) => {
    const updatedFacts = npc.known_facts.filter((_, i) => i !== factIndex);
    const res = await fetch(`/api/campaigns/${campaignId}/npcs/${npc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ known_facts: updatedFacts, replace_facts: true }),
    });
    if (res.ok) {
      router.refresh();
    }
  };

  return (
    <div className={styles.root}>
      {/* Confirm delete overlay */}
      {confirmDelete && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <p className={styles.confirmText}>Delete {npc.name}? This cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.btnConfirmDelete}
                onClick={() => void handleDelete()}
                disabled={deleting}
                type="button"
              >
                {deleting ? 'Deleting…' : 'Delete NPC'}
              </button>
              <button
                className={styles.btnCancel}
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                type="button"
              >
                Cancel
              </button>
            </div>
            {deleteError && <p className={styles.deleteError}>{deleteError}</p>}
          </div>
        </div>
      )}

      <Link href={`/campaigns/${campaignId}/npcs`} className={styles.backLink}>
        ← Back to NPCs
      </Link>

      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{npc.name}</h1>
          <span className={`${styles.sourceBadge} ${styles[`source_${npc.source}`]}`}>
            {SOURCE_LABELS[npc.source]}
          </span>
          <span className={`${styles.dispBadge} ${styles[`disp_${npc.disposition}`]}`}>
            {DISPOSITION_LABELS[npc.disposition]}
          </span>
        </div>
        <p className={styles.subtitle}>{campaignName}</p>
        <div className={styles.headerMeta}>
          {npc.race && <span className={styles.metaTag}>{npc.race}</span>}
          {npc.occupation && <span className={styles.metaTag}>{npc.occupation}</span>}
          {npc.current_location && (
            <span className={styles.location}>📍 {npc.current_location}</span>
          )}
        </div>
        {npc.last_extracted_at && (
          <p className={styles.lastExtracted}>
            Last updated from play: {formatDate(npc.last_extracted_at)}
          </p>
        )}
        <div className={styles.headerActions}>
          <Link href={`/campaigns/${campaignId}/npcs/${npc.id}/edit`} className={styles.btnEdit}>
            ✎ Edit NPC
          </Link>
          <button
            className={styles.btnDelete}
            type="button"
            onClick={() => setConfirmDelete(true)}
          >
            ✕ Delete NPC
          </button>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.body}>
        {npc.description && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>
              <span className={styles.sectionLabelText}>Description</span>
              <span className={styles.sectionLabelLine} />
            </div>
            <p className={styles.prose}>{npc.description}</p>
          </div>
        )}

        {npc.personality && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>
              <span className={styles.sectionLabelText}>Personality</span>
              <span className={styles.sectionLabelLine} />
            </div>
            <p className={styles.prose}>{npc.personality}</p>
          </div>
        )}

        {npc.voice_notes && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>
              <span className={styles.sectionLabelText}>Voice Notes</span>
              <span className={styles.sectionLabelLine} />
            </div>
            <p className={styles.prose}>{npc.voice_notes}</p>
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            <span className={styles.sectionLabelText}>Known Facts</span>
            <span className={styles.sectionLabelLine} />
          </div>
          {npc.known_facts.length === 0 ? (
            <p className={styles.emptyText}>No facts recorded yet.</p>
          ) : (
            <div className={styles.factList}>
              {(npc.known_facts as NpcKnownFact[]).map((fact, i) => (
                <div key={i} className={styles.factRow}>
                  <div className={styles.factContent}>
                    <span className={styles.factText}>{fact.fact}</span>
                    {fact.learned_at && (
                      <span className={styles.factMeta}>
                        {formatDate(fact.learned_at)}
                        {fact.learned_in_session && ' · Session'}
                      </span>
                    )}
                  </div>
                  <button
                    className={styles.btnDeleteFact}
                    type="button"
                    onClick={() => void handleDeleteFact(i)}
                    title="Remove fact"
                    aria-label="Remove fact"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
