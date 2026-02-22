'use client';

import { useState, useCallback, type ChangeEvent } from 'react';
import styles from './SessionNotes.module.css';

interface SessionNotesProps {
  campaignId: string;
}

export default function SessionNotes({ campaignId }: SessionNotesProps) {
  const storageKey = `roleverse-notes-${campaignId}`;
  const [notes, setNotes] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(storageKey) ?? '';
  });

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setNotes(value);
      localStorage.setItem(storageKey, value);
    },
    [storageKey]
  );

  return (
    <div className={styles.sessionNotes}>
      <div className={styles.sectionLabel}>Session Notes</div>
      <textarea
        className={styles.notesTextarea}
        value={notes}
        onChange={handleChange}
        placeholder="Jot down notes during the session..."
      />
    </div>
  );
}
