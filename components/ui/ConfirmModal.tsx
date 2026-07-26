'use client';

import { useState } from 'react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * If set, the confirm button stays disabled until the user types this exact
   * string into a field — a stronger, deliberately-harder-to-trigger-by-accident
   * variant for high-consequence deletes (e.g. type the campaign name).
   */
  typeToConfirmText?: string;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
  typeToConfirmText,
}: ConfirmModalProps) {
  const [typedValue, setTypedValue] = useState('');
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset the typed value whenever the modal's open state changes, so stale
  // input from a previous open never carries over — adjusted during render
  // rather than in an effect (avoids a cascading-render lint error).
  if (open !== prevOpen) {
    setPrevOpen(open);
    setTypedValue('');
  }

  if (!open) return null;

  // Plain string equality against a value React already renders as escaped
  // text (never dangerouslySetInnerHTML) — no injection surface here; this
  // only gates a button's disabled state, it never reaches a query or the DOM
  // as markup.
  const isConfirmDisabled = busy || (typeToConfirmText !== undefined && typedValue !== typeToConfirmText);

  return (
    <div className={styles.overlay} role="presentation" onClick={() => { if (!busy) onCancel(); }}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        <h2 id="confirm-modal-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.message}>{message}</p>

        {typeToConfirmText !== undefined && (
          <div className={styles.typeToConfirm}>
            <label htmlFor="confirm-modal-type-field" className={styles.typeToConfirmLabel}>
              Type <strong>{typeToConfirmText}</strong> to confirm
            </label>
            <input
              id="confirm-modal-type-field"
              className={styles.typeToConfirmInput}
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              disabled={busy}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={typeToConfirmText.length + 20}
            />
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnConfirm}
            onClick={onConfirm}
            disabled={isConfirmDisabled}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
