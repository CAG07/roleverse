'use client';

import styles from './ImportReviewModal.module.css';
import type { DiffRow } from '@/lib/character/import/diff';

interface ImportReviewModalProps {
  open: boolean;
  sourceLabel: string;
  rows: DiffRow[];
  caveats: string[];
  busy: boolean;
  error?: string | null;
  onApply: () => void;
  onCancel: () => void;
}

export function ImportReviewModal({
  open,
  sourceLabel,
  rows,
  caveats,
  busy,
  error,
  onApply,
  onCancel,
}: ImportReviewModalProps) {
  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onClick={() => { if (!busy) onCancel(); }}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="import-review-title"
        onClick={(e) => e.stopPropagation()}
      >
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        <h2 id="import-review-title" className={styles.title}>
          Review Import — {sourceLabel}
        </h2>

        {rows.length > 0 ? (
          <>
            <p className={styles.message}>
              This will overwrite the fields below on this character. Nothing is saved until you
              apply.
            </p>
            <div className={styles.diffTable}>
              {rows.map((row) => (
                <div key={row.label} className={styles.diffRow}>
                  <span className={styles.diffLabel}>{row.label}</span>
                  <span className={styles.diffOld}>{row.oldValue}</span>
                  <span className={styles.diffArrow}>→</span>
                  <span className={styles.diffNew}>{row.newValue}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className={styles.message}>
            No changes found — this file&apos;s values already match the character.
          </p>
        )}

        {caveats.length > 0 && (
          <div className={styles.caveats}>
            <p className={styles.caveatsTitle}>Couldn&apos;t be read from this file</p>
            <ul className={styles.caveatsList}>
              {caveats.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className={styles.errorMsg}>{error}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnConfirm}
            onClick={onApply}
            disabled={busy || rows.length === 0}
          >
            {busy ? 'Applying…' : 'Apply Changes'}
          </button>
          <button type="button" className={styles.btnCancel} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
