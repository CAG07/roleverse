'use client';

import styles from './CharacterDetailPage.module.css';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import CharacterSheet from './CharacterSheet';

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
  equipment: unknown[] | null;
  spells: unknown[] | null;
  updated_at: string;
}

interface CharacterDetailPageProps {
  campaignId: string;
  campaignName: string;
  character: CharacterDetail;
}

export function CharacterDetailPage({
  campaignId,
  campaignName,
  character,
}: CharacterDetailPageProps) {
  const router = useRouter();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hpPct =
    character.hp != null && character.max_hp != null && character.max_hp > 0
      ? Math.min(100, Math.max(0, (character.hp / character.max_hp) * 100))
      : 0;

  const metaParts = [
    character.race,
    character.class,
    character.level != null ? `Level ${character.level}` : null,
  ].filter(Boolean);

  const sheetData: Record<string, unknown> = {
    name: character.name,
    race: character.race ?? '—',
    class: character.class ?? '—',
    level: character.level ?? 0,
    hp: character.hp ?? 0,
    maxHp: character.max_hp ?? 0,
    ...(character.game_data_stats ?? {}),
    ...(character.game_data_combat ?? {}),
    ...(character.game_data_saves ?? {}),
    ...(character.game_data_skills ?? {}),
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', character.id);
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

      <div className={styles.headerCard}>
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        <div className={styles.headerTop}>
          <h1 className={styles.charName}>{character.name}</h1>
          <span className={styles.systemBadge}>{character.game_system}</span>
        </div>

        {metaParts.length > 0 && (
          <p className={styles.charMeta}>{metaParts.join(' · ')}</p>
        )}

        {character.hp != null && character.max_hp != null && (
          <div className={styles.hpSection}>
            <div className={styles.hpLabel}>
              <span>HP</span>
              <span className={styles.hpNumbers}>
                {character.hp} / {character.max_hp}
              </span>
            </div>
            <div className={styles.hpTrack}>
              <div className={styles.hpFill} style={{ width: `${hpPct}%` }} />
            </div>
          </div>
        )}

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
        />
      </div>
    </div>
  );
}
