'use client';

// components/session/JournalPanel.tsx
// Replaces ChatWindow when a campaign's AI Assist is off (campaigns.ai_assist_enabled
// = false, see 20260826000000_campaign_ai_assist_toggle.sql) — no AI chat window, no
// Anthropic call, nothing to route. A player writes their own narration directly into
// the same sessions.transcript entries ChatWindow already produces (role: 'player'),
// via the journal API route, so session logs, AI summaries, and per-session exports
// need no changes to keep working for a journal-mode session.

import { useCallback, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import styles from './JournalPanel.module.css';
import type { TranscriptEntry } from '@/lib/types/session';

interface JournalEntry {
  id: string;
  content: string;
  timestamp: Date;
}

function transcriptToEntries(entries: TranscriptEntry[]): JournalEntry[] {
  return entries
    .filter((entry) => !!entry.content)
    .map((entry, i) => {
      const parsed = entry.timestamp ? new Date(entry.timestamp) : null;
      return {
        id: `journal-${i}`,
        content: entry.content ?? '',
        timestamp: parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date(),
      };
    });
}

interface JournalPanelProps {
  sessionId: string;
  initialTranscript?: TranscriptEntry[];
}

export default function JournalPanel({ sessionId, initialTranscript = [] }: JournalPanelProps) {
  const [entries, setEntries] = useState<JournalEntry[]>(() => transcriptToEntries(initialTranscript));
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(async () => {
    const content = draft.trim();
    if (!content || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to save entry.' }));
        setError((body as { error?: string }).error ?? 'Failed to save entry.');
        return;
      }
      setEntries((prev) => [...prev, { id: `journal-${Date.now()}`, content, timestamp: new Date() }]);
      setDraft('');
      requestAnimationFrame(() => {
        const el = feedRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    } catch {
      setError('Failed to save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [draft, saving, sessionId]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSave();
    }
  };

  return (
    <div className={styles.journalPanel}>
      <div ref={feedRef} className={styles.feed}>
        {entries.length === 0 ? (
          <p className={styles.emptyText}>
            AI Assist is off for this campaign — no chat, no AI narration. Write your own
            entries below as you play. Use the Oracle in the sidebar for yes/no answers and
            inspiration whenever you want one.
          </p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className={styles.entry}>
              <p className={styles.entryContent}>{entry.content}</p>
              <span className={styles.entryTimestamp}>
                {entry.timestamp.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))
        )}
      </div>

      <div className={styles.inputBar}>
        <textarea
          className={styles.inputTextarea}
          value={draft}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write what happens next..."
          rows={4}
          disabled={saving}
        />
        <div className={styles.inputFooter}>
          {error && <p className={styles.errorText}>{error}</p>}
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => void handleSave()}
            disabled={saving || !draft.trim()}
          >
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
