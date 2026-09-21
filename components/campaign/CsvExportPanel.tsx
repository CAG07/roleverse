'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { downloadFile, slugify } from '@/lib/export/download-file';
import {
  buildCharactersKankaCsv,
  buildNpcsKankaCsv,
  buildSessionsKankaCsv,
  type KankaExportCharacterRow,
  type KankaExportSessionRow,
} from '@/lib/export/kanka-csv';
import type { Npc } from '@/lib/types/npc';
import styles from './CsvExportPanel.module.css';

type ExportKind = 'characters' | 'npcs' | 'sessions';

interface CsvExportPanelProps {
  campaignId: string;
  campaignName: string;
  gameSystem: string;
}

export default function CsvExportPanel({ campaignId, campaignName, gameSystem }: CsvExportPanelProps) {
  const [pending, setPending] = useState<ExportKind | null>(null);
  const [error, setError] = useState('');

  const slug = slugify(campaignName, 'campaign');

  const runExport = async (kind: ExportKind) => {
    setPending(kind);
    setError('');
    try {
      const supabase = createClient();

      if (kind === 'characters') {
        const { data, error: fetchError } = await supabase
          .from('characters')
          .select(
            'name, class, race, level, hp, max_hp, game_data_stats, game_data_combat, game_data_saves, game_data_skills, game_data_abilities, game_data_custom, spells, equipment'
          )
          .eq('campaign_id', campaignId);
        if (fetchError) throw fetchError;
        const csv = buildCharactersKankaCsv((data ?? []) as KankaExportCharacterRow[], gameSystem);
        downloadFile(csv, `${slug}-characters-kanka.csv`, 'text/csv');
      } else if (kind === 'npcs') {
        const { data, error: fetchError } = await supabase.from('npcs').select('*').eq('campaign_id', campaignId);
        if (fetchError) throw fetchError;
        const csv = buildNpcsKankaCsv((data ?? []) as Npc[]);
        downloadFile(csv, `${slug}-npcs-kanka.csv`, 'text/csv');
      } else {
        const { data, error: fetchError } = await supabase
          .from('sessions')
          .select('started_at, summary, transcript')
          .eq('campaign_id', campaignId)
          .order('started_at', { ascending: true });
        if (fetchError) throw fetchError;
        const csv = buildSessionsKankaCsv((data ?? []) as KankaExportSessionRow[]);
        downloadFile(csv, `${slug}-sessions-kanka.csv`, 'text/csv');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build export.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className={styles.infoPanel}>
      <h3 className={styles.infoPanelTitle}>CSV Export</h3>
      <p className={styles.explainer}>
        Download this campaign&apos;s characters, NPCs, or session journals as CSV files formatted for
        Kanka&apos;s bulk importer — also usable in any other journal or wiki tool that accepts CSV import.
      </p>
      <div className={styles.buttonRow}>
        <button
          type="button"
          className={styles.btnExport}
          onClick={() => void runExport('characters')}
          disabled={pending !== null}
        >
          {pending === 'characters' ? 'Exporting…' : 'Export Characters'}
        </button>
        <button
          type="button"
          className={styles.btnExport}
          onClick={() => void runExport('npcs')}
          disabled={pending !== null}
        >
          {pending === 'npcs' ? 'Exporting…' : 'Export NPCs'}
        </button>
        <button
          type="button"
          className={styles.btnExport}
          onClick={() => void runExport('sessions')}
          disabled={pending !== null}
        >
          {pending === 'sessions' ? 'Exporting…' : 'Export Session Journals'}
        </button>
      </div>
      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  );
}
