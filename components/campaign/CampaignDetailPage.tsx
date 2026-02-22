'use client';

import styles from './CampaignDetailPage.module.css';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface CampaignDetailPageProps {
  id: string;
  name: string;
  description: string | null;
  systemName: string;
  systemDescription: string;
}

export function CampaignDetailPage({
  id,
  name,
  description,
  systemName,
  systemDescription,
}: CampaignDetailPageProps) {
  const router = useRouter();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm(`Delete campaign "${name}"? This cannot be undone.`)) return;
    setDeleteError(null);
    const supabase = createClient();
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) {
      setDeleteError(error.message);
    } else {
      router.push('/dashboard');
    }
  };
  return (
    <div className={styles.campaignDetailRoot}>
      <Link href="/dashboard" className={styles.backLink}>
        ← Back to Dashboard
      </Link>

      <div className={styles.campaignHeader}>
        <div className={styles.campaignTitleRow}>
          <h1 className={styles.campaignTitle}>{name}</h1>
          <span className={styles.systemBadge}>{systemName}</span>
        </div>
        {description && <p className={styles.campaignDescription}>{description}</p>}
        {systemDescription && <p className={styles.campaignSystemInfo}>{systemDescription}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href={`/campaigns/${id}/session`} className={styles.btnStartSession}>
            ▶ Start Session
          </Link>
          <button type="button" className={styles.btnDelete} onClick={handleDelete}>
            ✕ Delete Campaign
          </button>
        </div>
        {deleteError && <p className={styles.deleteError}>{deleteError}</p>}
      </div>

      <div className={styles.sectionLabel}>
        <span className={styles.sectionLabelText}>Campaign Actions</span>
        <span className={styles.sectionLabelLine} />
      </div>

      <div className={styles.actionGrid}>
        <Link href={`/campaigns/${id}/upload`} className={styles.actionCard}>
          <h3 className={styles.actionCardTitle}>Upload PDFs</h3>
          <p className={styles.actionCardBody}>Upload rulebooks and reference materials.</p>
        </Link>

        <Link href={`/campaigns/${id}/characters`} className={styles.actionCard}>
          <h3 className={styles.actionCardTitle}>Characters</h3>
          <p className={styles.actionCardBody}>View and manage party characters.</p>
        </Link>
      </div>

      <div className={styles.sectionLabel}>
        <span className={styles.sectionLabelText}>Campaign Info</span>
        <span className={styles.sectionLabelLine} />
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoPanel}>
          <h3 className={styles.infoPanelTitle}>Party Members</h3>
          <p className={styles.infoPanelPlaceholder}>Party management coming soon.</p>
        </div>

        <div className={styles.infoPanel}>
          <h3 className={styles.infoPanelTitle}>Session History</h3>
          <p className={styles.infoPanelPlaceholder}>Session logs coming soon.</p>
        </div>
      </div>
    </div>
  );
}
