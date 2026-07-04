import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import styles from './page.module.css';
import type { Npc, NpcDisposition, NpcSource } from '@/lib/types/npc';

interface Props {
  params: Promise<{ id: string }>;
}

const DISPOSITION_LABELS: Record<NpcDisposition, string> = {
  friendly: 'Friendly',
  helpful: 'Helpful',
  neutral: 'Neutral',
  wary: 'Wary',
  hostile: 'Hostile',
};

const SOURCE_LABELS: Record<NpcSource, string> = {
  manual: 'Manual',
  extracted: 'Extracted',
  imported: 'Imported',
};

export default async function NpcsListPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, owner_id')
    .eq('id', id)
    .single();

  if (!campaign || campaign.owner_id !== user?.id) notFound();

  const { data: npcs } = await supabase
    .from('npcs')
    .select('*')
    .eq('campaign_id', id)
    .order('name', { ascending: true });

  const npcList = (npcs as Npc[]) ?? [];

  return (
    <div className={styles.root}>
      <Link href={`/campaigns/${id}`} className={styles.backLink}>
        ← Back to {campaign.name as string}
      </Link>

      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>NPCs</h1>
          <Link href={`/campaigns/${id}/npcs/new`} className={styles.btnNew}>
            + Add NPC
          </Link>
        </div>
        <p className={styles.subtitle}>{campaign.name as string}</p>
      </div>

      <div className={styles.sectionLabel}>
        <span className={styles.sectionLabelText}>Roster</span>
        <span className={styles.sectionLabelLine} />
      </div>

      {npcList.length > 0 ? (
        <div className={styles.npcGrid}>
          {npcList.map((npc) => (
            <Link
              key={npc.id}
              href={`/campaigns/${id}/npcs/${npc.id}`}
              className={styles.npcCard}
            >
              <div className={styles.cardTop}>
                <span className={styles.npcName}>{npc.name}</span>
                <div className={styles.badgeGroup}>
                  <span className={`${styles.sourceBadge} ${styles[`source_${npc.source}`]}`}>
                    {SOURCE_LABELS[npc.source]}
                  </span>
                  <span className={`${styles.dispBadge} ${styles[`disp_${npc.disposition}`]}`}>
                    {DISPOSITION_LABELS[npc.disposition]}
                  </span>
                </div>
              </div>
              {(npc.race ?? npc.occupation) && (
                <div className={styles.npcMeta}>
                  {[npc.race, npc.occupation].filter(Boolean).join(' · ')}
                </div>
              )}
              {npc.current_location && (
                <div className={styles.npcLocation}>{npc.current_location}</div>
              )}
              {npc.description && (
                <div className={styles.npcPreview}>
                  {npc.description.length > 100
                    ? `${npc.description.slice(0, 100)}…`
                    : npc.description}
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            No NPCs yet. Add one manually or extract from a session transcript.
          </p>
          <Link href={`/campaigns/${id}/npcs/new`} className={styles.btnEmptyAction}>
            + Add NPC
          </Link>
        </div>
      )}
    </div>
  );
}
