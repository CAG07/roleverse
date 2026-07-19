'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './InlineNumberEditor.module.css';

interface InlineNumberEditorProps {
  value: number;
  onSave: (value: number) => void;
  className?: string;
  ariaLabel?: string;
}

const SAVE_DEBOUNCE_MS = 500;

/**
 * Click-to-edit number display. Typing schedules a debounced save so rapid
 * keystrokes (e.g. adjusting HP mid-combat) don't spam the write path; blur
 * or Enter commits immediately.
 */
export default function InlineNumberEditor({
  value,
  onSave,
  className,
  ariaLabel,
}: InlineNumberEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resync the draft when `value` changes externally (e.g. another client's write),
  // but only while not actively editing. This runs during render, not an effect,
  // per React's "adjusting state when props change" pattern.
  if (value !== prevValue && !editing) {
    setPrevValue(value);
    setDraft(String(value));
  }

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  const scheduleSave = (raw: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed) && parsed !== value) onSave(parsed);
    }, SAVE_DEBOUNCE_MS);
  };

  const commit = () => {
    setEditing(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const parsed = parseInt(draft, 10);
    if (!Number.isNaN(parsed) && parsed !== value) onSave(parsed);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className={`${styles.display} ${className ?? ''}`}
        onClick={() => setEditing(true)}
        aria-label={ariaLabel}
      >
        {value}
      </button>
    );
  }

  return (
    <input
      type="number"
      className={`${styles.input} ${className ?? ''}`}
      value={draft}
      autoFocus
      aria-label={ariaLabel}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        setDraft(e.target.value);
        scheduleSave(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setDraft(String(value));
          setEditing(false);
        }
      }}
    />
  );
}
