'use client';

import { useState, useEffect, useCallback } from 'react';

interface SessionNotesProps {
  campaignId: string;
}

export default function SessionNotes({ campaignId }: SessionNotesProps) {
  const storageKey = `roleverse-notes-${campaignId}`;
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setNotes(saved);
  }, [storageKey]);

  const handleChange = useCallback(
    (e: { target: { value: string } }) => {
      const value = e.target.value;
      setNotes(value);
      localStorage.setItem(storageKey, value);
    },
    [storageKey]
  );

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-medieval text-sm text-gold">Session Notes</h3>
      <textarea
        value={notes}
        onChange={handleChange}
        placeholder="Jot down notes during the session..."
        className="min-h-[120px] w-full resize-y rounded border border-gold/40 bg-cream/80 px-3 py-2 font-body text-sm text-brown placeholder:text-brown/40 focus:outline-none focus:ring-1 focus:ring-teal"
      />
    </div>
  );
}
