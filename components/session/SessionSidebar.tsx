'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import FGConnectionStatus from './FGConnectionStatus';
import VoiceStatus from './VoiceStatus';
import styles from './SessionSidebar.module.css';

interface PartyMemberInfo {
  id: string;
  name: string;
  role: 'dm' | 'player';
}

interface SessionSidebarProps {
  campaignName: string;
  gameSystem: string;
  partyMembers: PartyMemberInfo[];
  isDM?: boolean;
  campaignId: string;
  onToggleNotes?: () => void;
}

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
  partyMembers,
  isDM = false,
  campaignId,
  onToggleNotes,
}: SessionSidebarProps) {
  return (
    <aside className={styles.sessionSidebar}>
      {/* Campaign header */}
      <div className={styles.sidebarHeader}>
        <h2 className={styles.campaignName}>{campaignName}</h2>
        <span className={styles.gameSystemBadge}>{gameSystem}</span>
      </div>

      {/* Scrollable sections */}
      <div className={styles.sidebarContent}>
        <CollapsibleSection title="Party Members">
          {partyMembers.length === 0 ? (
            <p className={styles.emptyText}>No members yet.</p>
          ) : (
            <ul className={styles.partyList}>
              {partyMembers.map((m) => (
                <li key={m.id} className={styles.partyMember}>
                  <span className={styles.memberName}>{m.name}</span>
                  <span className={`${styles.roleBadge} ${m.role === 'dm' ? styles.dm : styles.player}`}>
                    {m.role === 'dm' ? 'DM' : 'Player'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Session Notes" defaultOpen={false}>
          <button className={styles.btnNotes} onClick={onToggleNotes} type="button">
            Open Notes Panel
          </button>
        </CollapsibleSection>

        {isDM && (
          <CollapsibleSection title="Settings" defaultOpen={false}>
            <a href={`/campaigns/${campaignId}`} className={styles.settingsLink}>
              Campaign Settings
            </a>
          </CollapsibleSection>
        )}
      </div>

      {/* Status indicators */}
      <div className={styles.sidebarFooter}>
        <FGConnectionStatus />
        <VoiceStatus />
      </div>
    </aside>
  );
}
