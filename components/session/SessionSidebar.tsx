'use client';

import { useState } from 'react';
import FGConnectionStatus from './FGConnectionStatus';
import VoiceStatus from './VoiceStatus';

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
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="collapsible">
      <style jsx>{`
        .collapsible {
          border-bottom: 1px solid var(--void-border);
        }
        .toggle-btn {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          background: none;
          border: none;
          font-family: var(--font-heading);
          font-size: 0.625rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ivory-muted);
          cursor: pointer;
          transition: color 0.15s;
        }
        .toggle-btn:hover {
          color: var(--gold);
        }
        .toggle-icon {
          font-size: 0.5rem;
          color: var(--crimson-dim);
        }
        .section-content {
          padding: 0 0.875rem 0.625rem;
        }
      `}</style>
      <button className="toggle-btn" onClick={() => setOpen(!open)} type="button">
        <span className="toggle-icon">{open ? '▼' : '▶'}</span>
        {title}
      </button>
      {open && <div className="section-content">{children}</div>}
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
    <aside className="session-sidebar">
      <style jsx>{`
        .session-sidebar {
          display: flex;
          height: 100%;
          width: 100%;
          flex-direction: column;
          background: var(--void-mid);
          border-right: var(--rule-thin);
          color: var(--ivory);
        }

        /* Campaign header */
        .sidebar-header {
          padding: 0.875rem;
          border-bottom: var(--rule-thin);
        }
        .campaign-name {
          font-family: var(--font-heading);
          font-size: 0.875rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--ivory);
          margin: 0 0 0.375rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .game-system-badge {
          font-family: var(--font-heading);
          font-size: 0.575rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gold);
          background: rgba(184, 136, 42, 0.1);
          border: 1px solid var(--gold-dim);
          padding: 0.15rem 0.4rem;
          display: inline-block;
        }

        /* Scrollable content */
        .sidebar-content {
          flex: 1;
          overflow-y: auto;
        }

        /* Party member rows */
        .party-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .party-member {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-family: var(--font-body);
          font-size: 0.775rem;
          padding: 0.25rem 0;
        }
        .member-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--ivory-muted);
        }
        .role-badge {
          font-family: var(--font-heading);
          font-size: 0.525rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.15rem 0.4rem;
          border: 1px solid;
        }
        .role-badge.dm {
          color: var(--gold);
          border-color: var(--gold-dim);
          background: rgba(184, 136, 42, 0.1);
        }
        .role-badge.player {
          color: var(--ivory-muted);
          border-color: var(--void-border);
          background: transparent;
        }
        .empty-text {
          font-family: var(--font-body);
          font-size: 0.75rem;
          color: var(--ivory-dim);
        }

        /* Notes button */
        .btn-notes {
          width: 100%;
          padding: 0.375rem 0.75rem;
          background: var(--void-surface);
          border: var(--rule-thin);
          font-family: var(--font-heading);
          font-size: 0.625rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ivory-muted);
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-notes:hover {
          color: var(--gold);
          border-color: var(--gold-dim);
        }

        /* Settings link */
        .settings-link {
          display: block;
          width: 100%;
          padding: 0.375rem 0.75rem;
          background: var(--void-surface);
          border: var(--rule-thin);
          font-family: var(--font-heading);
          font-size: 0.625rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ivory-muted);
          text-decoration: none;
          transition: all 0.15s;
        }
        .settings-link:hover {
          color: var(--crimson-bright);
          border-color: var(--crimson-dim);
        }

        /* Status area */
        .sidebar-footer {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          padding: 0.625rem;
          border-top: var(--rule-thin);
        }
      `}</style>

      {/* Campaign header */}
      <div className="sidebar-header">
        <h2 className="campaign-name">{campaignName}</h2>
        <span className="game-system-badge">{gameSystem}</span>
      </div>

      {/* Scrollable sections */}
      <div className="sidebar-content">
        <CollapsibleSection title="Party Members">
          {partyMembers.length === 0 ? (
            <p className="empty-text">No members yet.</p>
          ) : (
            <ul className="party-list">
              {partyMembers.map((m) => (
                <li key={m.id} className="party-member">
                  <span className="member-name">{m.name}</span>
                  <span className={`role-badge ${m.role}`}>
                    {m.role === 'dm' ? 'DM' : 'Player'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Session Notes" defaultOpen={false}>
          <button className="btn-notes" onClick={onToggleNotes} type="button">
            Open Notes Panel
          </button>
        </CollapsibleSection>

        {isDM && (
          <CollapsibleSection title="Settings" defaultOpen={false}>
            <a href={`/campaigns/${campaignId}`} className="settings-link">
              Campaign Settings
            </a>
          </CollapsibleSection>
        )}
      </div>

      {/* Status indicators */}
      <div className="sidebar-footer">
        <FGConnectionStatus />
        <VoiceStatus />
      </div>
    </aside>
  );
}
