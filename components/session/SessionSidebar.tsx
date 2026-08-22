'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { getGameSystem } from '@/lib/game-systems/registry';
import FGConnectionStatus from './FGConnectionStatus';
import VoiceStatus from './VoiceStatus';
import OraclePanel from './OraclePanel';
import styles from './SessionSidebar.module.css';

interface SessionSidebarProps {
  campaignName: string;
  gameSystem: string;
  isDM?: boolean;
  campaignId: string;
  sessionId: string;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  // onStopSession removed — sessions are stopped from campaign settings only
}

const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20, 22, 24] as const;

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.collapsible}>
      <button className={styles.toggleBtn} onClick={() => setOpen(!open)} type="button">
        <span className={styles.toggleIcon}>{open ? '▼' : '▶'}</span>
        {title}
      </button>
      {open && <div className={styles.sectionContent}>{children}</div>}
    </div>
  );
}

export default function SessionSidebar({
  campaignName,
  gameSystem,
  isDM = false,
  campaignId,
  sessionId,
  fontSize,
  onFontSizeChange,
}: SessionSidebarProps) {
  return (
    <aside className={styles.sessionSidebar}>
      {/* Campaign header */}
      <div className={styles.sidebarHeader}>
        <h2 className={styles.campaignName}>{campaignName}</h2>
        <span className={styles.gameSystemBadge}>
          {getGameSystem(gameSystem)?.name ?? gameSystem}
        </span>
      </div>

      {/* Scrollable sections */}
      <div className={styles.sidebarContent}>
        <Link href={`/campaigns/${campaignId}`} className={styles.backLink}>
          ← Back to Campaign
        </Link>
        <Link href={`/campaigns/${campaignId}/sessions`} className={styles.historyLink}>
          ◆ Session History
        </Link>

        <div className={styles.fontSizeRow}>
          <span className={styles.fontSizeLabel}>Text Size</span>
          <div className={styles.fontSizeOptions}>
            {FONT_SIZE_OPTIONS.map((px) => (
              <button
                key={px}
                className={`${styles.fontSizeBtn}${fontSize === px ? ` ${styles.active}` : ''}`}
                onClick={() => onFontSizeChange(px)}
                aria-label={`Set chat text size to ${px} pixels`}
                aria-pressed={fontSize === px}
                type="button"
              >
                {px}px
              </button>
            ))}
          </div>
        </div>

        {isDM && (
          <CollapsibleSection title="Settings" defaultOpen={false}>
            <a href={`/campaigns/${campaignId}`} className={styles.settingsLink}>
              Campaign Settings
            </a>
          </CollapsibleSection>
        )}

        <CollapsibleSection title="Oracle" defaultOpen={false}>
          <OraclePanel campaignId={campaignId} sessionId={sessionId} />
        </CollapsibleSection>
      </div>

      {/* Status indicators */}
      <div className={styles.sidebarFooter}>
        <FGConnectionStatus />
        <VoiceStatus />
      </div>
    </aside>
  );
}
