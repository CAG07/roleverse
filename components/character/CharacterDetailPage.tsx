'use client';

import styles from './CharacterDetailPage.module.css';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { assembleCharacterData } from '@/lib/character/assembleCharacterData';
import { buildFantasyGroundsExport } from '@/lib/character/export/fantasy-grounds';
import { buildPlainTextSheet } from '@/lib/character/export/plain-text';
import { downloadFile, slugify } from '@/lib/export/download-file';
import { FG_XML_IMPORT_SUPPORTED_SYSTEMS, parseFantasyGroundsCharacterXml } from '@/lib/character/import/fantasy-grounds';
import { parsePlainTextCharacterSheet } from '@/lib/character/import/plain-text';
import { buildImportDiff, buildImportUpdatePayload } from '@/lib/character/import/diff';
import type { ImportPreview } from '@/lib/character/import/diff';
import type { ParsedCharacterImport } from '@/lib/character/import/types';
import { ImportReviewModal } from './ImportReviewModal';
import { HpUpdateContext } from '@/lib/characters/hp-update-context';
import CharacterSheet from './CharacterSheet';
import CharacterHeaderBanner from './CharacterHeaderBanner';

const FG_IMPORT_CAVEATS_5E = [
  "Currency, spellcasting ability/DC/attack modifier, known spells, and appearance/backstory/allies/treasure text live only in the file's freeform notes, not dedicated fields — copied into this character's Notes instead of split apart.",
];
const FG_IMPORT_CAVEATS_PF2E = [
  "This importer's field mapping is based on a single third-party sample, not a real Fantasy Grounds PF2E export — double-check every value after importing.",
  "Currency, AC/shield breakdowns, strikes, spell details, and personal/campaign-notes text live only in the file's freeform notes — copied into this character's Notes instead of split apart.",
];
const FG_IMPORT_CAVEATS_ADD = [
  'The weapon vs. non-weapon proficiency list (<proficiencylist>) is not imported — Fantasy Grounds’ own meaning for that tag is still unconfirmed in our own export mapping.',
  'Detailed AC breakdown and most ability-score adjustment sub-fields are not imported — edit them manually if needed.',
];
const FG_IMPORT_CAVEATS: Record<string, string[]> = {
  '5E_2014': FG_IMPORT_CAVEATS_5E,
  PATHFINDER_2E: FG_IMPORT_CAVEATS_PF2E,
  ADD1E: FG_IMPORT_CAVEATS_ADD,
  ADD2E: FG_IMPORT_CAVEATS_ADD,
};
const TEXT_IMPORT_CAVEATS = [
  'If the Race / Class line in the file has only one of those two values (not both), neither is updated — it’s ambiguous which one it is.',
];

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
  /** Where the back link goes — context-aware based on how this page was reached
   *  (campaign party list vs. the Characters list page). Defaults preserve the
   *  original "always Characters list" behavior for any caller that doesn't pass it. */
  backHref?: string;
  backLabel?: string;
}

export function CharacterDetailPage({
  campaignId,
  campaignName,
  character,
  funnelParty,
  backHref,
  backLabel,
}: CharacterDetailPageProps) {
  const router = useRouter();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    sourceLabel: string;
    parsed: ParsedCharacterImport;
    preview: ImportPreview;
    caveats: string[];
  } | null>(null);

  const metaParts = [
    character.race,
    character.class,
    character.level != null ? `Level ${character.level}` : null,
  ].filter(Boolean);

  const sheetData = assembleCharacterData(character);
  const exportable = buildFantasyGroundsExport(character.game_system, sheetData, character.equipment ?? []);
  const plainText = buildPlainTextSheet(character.game_system, sheetData, character.equipment ?? []);
  const fgImportSupported = FG_XML_IMPORT_SUPPORTED_SYSTEMS.has(character.game_system);

  const openImportReview = (sourceLabel: string, parsed: ParsedCharacterImport, caveats: string[]) => {
    const preview = buildImportDiff(character.game_system, character, sheetData, parsed);
    setPendingImport({ sourceLabel, parsed, preview, caveats });
  };

  const handleFgFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    const text = await file.text();
    const parsed = parseFantasyGroundsCharacterXml(character.game_system, text);
    if ('error' in parsed) {
      setImportError(parsed.error);
      return;
    }
    openImportReview('Fantasy Grounds', parsed, FG_IMPORT_CAVEATS[character.game_system] ?? []);
  };

  const handleTextFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    const text = await file.text();
    const parsed = parsePlainTextCharacterSheet(character.game_system, text);
    if ('error' in parsed) {
      setImportError(parsed.error);
      return;
    }
    openImportReview('Text File', parsed, TEXT_IMPORT_CAVEATS);
  };

  const handleApplyImport = async () => {
    if (!pendingImport) return;
    setApplying(true);
    setApplyError(null);
    const supabase = createClient();
    const payload = buildImportUpdatePayload(character, pendingImport.parsed);
    const { error } = await supabase.from('characters').update(payload).eq('id', character.id);
    if (error) {
      setApplyError(error.message);
      setApplying(false);
      return;
    }
    setApplying(false);
    setPendingImport(null);
    router.refresh();
  };

  const handleCancelImport = () => {
    if (applying) return;
    setPendingImport(null);
    setApplyError(null);
  };

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

      <Link href={backHref ?? `/campaigns/${campaignId}/characters`} className={styles.backLink}>
        ← {backLabel ?? 'Back to Characters'}
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
          {fgImportSupported && (
            <>
              <input
                type="file"
                accept=".xml,text/xml,application/xml"
                id="fgImportInput"
                className={styles.fileInputHidden}
                onChange={(e) => void handleFgFileChange(e)}
              />
              <label htmlFor="fgImportInput" className={styles.btnExport}>
                ⇧ Import from Fantasy Grounds
              </label>
            </>
          )}
          {plainText && (
            <>
              <input
                type="file"
                accept=".txt,text/plain"
                id="textImportInput"
                className={styles.fileInputHidden}
                onChange={(e) => void handleTextFileChange(e)}
              />
              <label htmlFor="textImportInput" className={styles.btnExport}>
                ⇧ Import as Text
              </label>
            </>
          )}
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
        {importError && <p className={styles.deleteError}>{importError}</p>}
      </div>

      <ImportReviewModal
        open={pendingImport != null}
        sourceLabel={pendingImport?.sourceLabel ?? ''}
        rows={pendingImport?.preview.rows ?? []}
        caveats={pendingImport?.caveats ?? []}
        busy={applying}
        error={applyError}
        onApply={() => void handleApplyImport()}
        onCancel={handleCancelImport}
      />

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
        <HpUpdateContext.Provider value={() => router.refresh()}>
          <CharacterSheet
            characterId={character.id}
            gameSystem={character.game_system}
            characterData={sheetData}
            equipment={character.equipment ?? []}
            rawGameDataStats={character.game_data_stats ?? {}}
            funnelParty={funnelParty}
          />
        </HpUpdateContext.Provider>
      </div>
    </div>
  );
}
