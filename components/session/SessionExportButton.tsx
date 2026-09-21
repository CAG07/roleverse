'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { downloadFile } from '@/lib/export/download-file';
import { buildSessionMarkdown } from '@/lib/sessions/build-session-export';
import styles from './SessionExportButton.module.css';

interface SessionExportButtonProps {
  campaignId: string;
  sessionId: string;
}

export default function SessionExportButton({ campaignId, sessionId }: SessionExportButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setPending(true);
    setError('');
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select('started_at, ended_at, summary, transcript')
        .eq('id', sessionId)
        .eq('campaign_id', campaignId)
        .single();
      if (fetchError || !data) throw fetchError ?? new Error('Session not found.');

      const markdown = buildSessionMarkdown(data);
      const dateSlug = new Date(data.started_at as string).toISOString().slice(0, 10);
      downloadFile(markdown, `session-${dateSlug}.md`, 'text/markdown');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build export.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.btnExport} onClick={() => void handleExport()} disabled={pending}>
        {pending ? 'Exporting…' : '⬇ Download Transcript'}
      </button>
      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  );
}
