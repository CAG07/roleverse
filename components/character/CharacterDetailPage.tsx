'use client';

import styles from './CharacterDetailPage.module.css';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { assembleCharacterData } from '@/lib/character/assembleCharacterData';
import { buildFantasyGroundsExport } from '@/lib/character/export/fantasy-grounds';
import { buildPlainTextSheet } from '@/lib/character/export/plain-text';
import { downloadFile, slugify } from '@/lib/export/download-file';
import CharacterSheet from './CharacterSheet';
import CharacterHeaderBanner from './CharacterHeaderBanner';

interface DCCFunnelMember {
  id: string;
  name: string;
  occupation?: string;
  hp?: { current: number; max: number };
  ac?: number;
}

export interface CharacterDetail {
  id: string;
  name: string;
  class: string | null;
  race: string | null;
  level: number | null;
  hp: number | null;
  max_hp: number | null;
  notes: string | null;
  game_system: string;
  game_data_stats: Record<string, unknown> | null;
  game_data_combat: Record<string, unknown> | null;
  game_data_saves: Record<string, unknown> | null;
  game_data_skills: Record<string, unknown> | null;
  game_data_abilities: unknown[] | null;
  game_data_custom: unknown[] | null;
  equipment: unknown[] | null;
  spells: unknown[] | null;
  updated_at: string;
}

interface CharacterDetailPageProps {
  campaignId: string;
  campaignName: string;
  character: CharacterDetail;
  funnelParty?: DCCFunnelMember[];
}

export function CharacterDetailPage({
  campaignId,
  campaignName,
  character,
  funnelParty,
}: CharacterDetailPageProps) {
  const router = useRouter();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const metaParts = [
    character.race,
    character.class,
    character.level != null ? `Level ${character.level}` : null,
  ].filter(Boolean);

  const sheetData = assembleCharacterData(character);
  const exportable = buildFantasyGroundsExport(character.game_system, sheetData, character.equipment ?? []);
  const plainText = buildPlainTextSheet(character.game_system, sheetData, character.equipment ?? []);

  const handleExport = () => {
    if (!exportable) return;
    downloadFile(exportable.content, exportable.filename, exportable.mimeType);
  };

  const handleExportText = () => {
    if (!plainText) return;
    const slug = slugify(character.name || 'character', 'character');
    downloadFile(plainText, `${slug}.txt`, 'text/plain');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const supabase = createClient();
    const { error } = await supabase.from('characters').delete().eq('id', character.id);
    if (error) {
      setDeleteError(error.message);
      setDeleting(false);
      setConfirmDelete(false);
    } else {
      router.push(`/campaigns/${campaignId}/characters`);
    }
  };

  return (
    <div className={styles.root}>
      <ConfirmModal
        open={confirmDelete}
        title="Delete Character"
        message={`Delete character "${character.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <Link href={`/campaigns/${campaignId}/characters`} className={styles.backLink}>
        ← Back to Characters
      </Link>

      <CharacterHeaderBanner
        name={character.name}
        gameSystem={character.game_system}
        metaParts={metaParts}
        hp={character.hp}
        maxHp={character.max_hp}
      />

      <div className={styles.actionsSection}>
        <div className={styles.actions}>
          <Link
            href={`/campaigns/${campaignId}/characters/${character.id}/edit`}
            className={styles.btnEdit}
          >
            ✎ Edit
          </Link>
          <button type="button" className={styles.btnDelete} onClick={() => setConfirmDelete(true)}>
            ✕ Delete
          </button>
          {exportable && (
            <button type="button" className={styles.btnExport} onClick={handleExport}>
              ⇩ Export to Fantasy Grounds
            </button>
          )}
          {plainText && (
            <button type="button" className={styles.btnExport} onClick={handleExportText}>
              ⇩ Export as Text
            </button>
          )}
          <button type="button" className={styles.btnExport} onClick={handlePrint}>
            🖶 Print / Save as PDF
          </button>
        </div>
        {deleteError && <p className={styles.deleteError}>{deleteError}</p>}
      </div>

      {character.notes && (
        <div className={styles.notesSection}>
          <p className={styles.sectionLabel}>Notes</p>
          <p className={styles.notesText}>{character.notes}</p>
        </div>
      )}

      <div className={styles.sheetSection}>
        <p className={styles.sectionLabel} style={{ marginBottom: '0.5rem' }}>
          Character Sheet · {campaignName}
        </p>
        <CharacterSheet
          characterId={character.id}
          gameSystem={character.game_system}
          characterData={sheetData}
          equipment={character.equipment ?? []}
          rawGameDataStats={character.game_data_stats ?? {}}
          funnelParty={funnelParty}
        />
      </div>
    </div>
  );
}
