'use client';

import { useState, useCallback, type ChangeEvent } from 'react';

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
    <div className="session-notes">
      <style jsx>{`
        .session-notes {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .section-label {
          font-family: var(--font-heading);
          font-size: 0.575rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--gold);
        }
        .notes-textarea {
          min-height: 120px;
          width: 100%;
          resize: vertical;
          background: var(--void-surface);
          border: var(--rule-thin);
          color: var(--ivory);
          font-family: var(--font-body);
          font-size: 0.85rem;
          padding: 0.5rem 0.75rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .notes-textarea::placeholder {
          color: var(--ivory-dim);
        }
        .notes-textarea:focus {
          border-color: var(--crimson);
        }
      `}</style>
      <div className="section-label">Session Notes</div>
      <textarea
        className="notes-textarea"
        value={notes}
        onChange={handleChange}
        placeholder="Jot down notes during the session..."
      />
    </div>
  );
}
