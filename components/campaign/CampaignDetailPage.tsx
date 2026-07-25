'use client';

import styles from './CampaignDetailPage.module.css';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export interface CampaignCharacter {
  id: string;
  name: string;
  class: string | null;
  race: string | null;
  level: number | null;
  hp: number | null;
  max_hp: number | null;
}

export interface CampaignSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  transcript: string | null;
}

interface CampaignDetailPageProps {
  id: string;
  name: string;
  description: string | null;
  moduleDescription: string | null;
  systemName: string;
  systemDescription: string;
  characters: CampaignCharacter[];
  activeSession: { id: string } | null;
  recentSessions: CampaignSession[];
  sessionCount: number;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatSessionDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return 'Active';
  const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function CampaignDetailPage({
  id,
  name,
  description,
  moduleDescription,
  systemName,
  systemDescription,
  characters,
  activeSession,
  recentSessions,
  sessionCount,
}: CampaignDetailPageProps) {
  const router = useRouter();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [stoppingSession, setStoppingSession] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingModule, setEditingModule] = useState(false);
  const [moduleDraft, setModuleDraft] = useState(moduleDescription ?? '');
  const [savedModuleDescription, setSavedModuleDescription] = useState(moduleDescription);
  const [savingModule, setSavingModule] = useState(false);
  const [moduleError, setModuleError] = useState<string | null>(null);

  const handleSaveModuleDescription = async () => {
    setSavingModule(true);
    setModuleError(null);
    const trimmed = moduleDraft.trim() || null;
    const supabase = createClient();
    const { error } = await supabase
      .from('campaigns')
      .update({ module_description: trimmed })
      .eq('id', id);
    if (error) {
      setModuleError(error.message);
    } else {
      setSavedModuleDescription(trimmed);
      setEditingModule(false);
    }
    setSavingModule(false);
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    setStoppingSession(true);
    try {
      await fetch(`/api/sessions/${activeSession.id}/end`, { method: 'POST' });
      router.refresh();
    } finally {
      setStoppingSession(false);
      setConfirmStop(false);
    }
  };

  const lastSession = recentSessions[0] ?? null;

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const supabase = createClient();
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) {
      setDeleteError(error.message);
      setDeleting(false);
      setConfirmDelete(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className={styles.campaignDetailRoot}>
      <ConfirmModal
        open={confirmDelete}
        title="Delete Campaign"
        message={`Delete campaign "${name}"? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {confirmStop && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <p className={styles.confirmText}>End the active session?</p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.btnConfirmStop}
                onClick={handleStopSession}
                disabled={stoppingSession}
              >
                {stoppingSession ? 'Ending…' : 'End Session'}
              </button>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={() => setConfirmStop(false)}
                disabled={stoppingSession}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
            ▶ {activeSession ? 'Resume Session' : 'Start Session'}
          </Link>
          {activeSession && (
            <button
              type="button"
              className={styles.btnStopSession}
              onClick={() => setConfirmStop(true)}
              disabled={stoppingSession}
            >
              ■ {stoppingSession ? 'Stopping…' : 'Stop Session'}
            </button>
          )}
          <Link href={`/campaigns/${id}/edit`} className={styles.btnEdit}>
            ✎ Edit Campaign
          </Link>
          <button type="button" className={styles.btnDelete} onClick={() => setConfirmDelete(true)}>
            ✕ Delete Campaign
          </button>
        </div>
        {deleteError && <p className={styles.deleteError}>{deleteError}</p>}
      </div>

      {/* Stats strip */}
      <div className={styles.statsStrip}>
        <div className={styles.statBlock}>
          <span className={`${styles.statCorner} ${styles.tl}`} />
          <span className={`${styles.statCorner} ${styles.tr}`} />
          <span className={`${styles.statCorner} ${styles.bl}`} />
          <span className={`${styles.statCorner} ${styles.br}`} />
          <span className={styles.statValue}>{characters.length}</span>
          <span className={styles.statLabel}>Characters</span>
        </div>
        <div className={styles.statBlock}>
          <span className={`${styles.statCorner} ${styles.tl}`} />
          <span className={`${styles.statCorner} ${styles.tr}`} />
          <span className={`${styles.statCorner} ${styles.bl}`} />
          <span className={`${styles.statCorner} ${styles.br}`} />
          <span className={styles.statValue}>{sessionCount}</span>
          <span className={styles.statLabel}>Sessions</span>
        </div>
        <div className={styles.statBlock}>
          <span className={`${styles.statCorner} ${styles.tl}`} />
          <span className={`${styles.statCorner} ${styles.tr}`} />
          <span className={`${styles.statCorner} ${styles.bl}`} />
          <span className={`${styles.statCorner} ${styles.br}`} />
          <span className={styles.statValue}>
            {lastSession ? formatRelativeTime(lastSession.started_at) : 'Never'}
          </span>
          <span className={styles.statLabel}>Last Played</span>
        </div>
      </div>

      <div className={styles.sectionLabel}>
        <span className={styles.sectionLabelText}>Campaign Actions</span>
        <span className={styles.sectionLabelLine} />
      </div>

      <div className={styles.actionGrid}>
        <Link href={`/campaigns/${id}/characters`} className={styles.actionCard}>
          <h3 className={styles.actionCardTitle}>Characters</h3>
          <p className={styles.actionCardBody}>View and manage party characters.</p>
        </Link>
        <Link href={`/campaigns/${id}/npcs`} className={styles.actionCard}>
          <h3 className={styles.actionCardTitle}>NPCs</h3>
          <p className={styles.actionCardBody}>Manage the NPC roster with disposition and facts.</p>
        </Link>
        <Link href={`/campaigns/${id}/sessions`} className={styles.actionCard}>
          <h3 className={styles.actionCardTitle}>Session History</h3>
          <p className={styles.actionCardBody}>Browse all sessions, transcripts, and AI summaries.</p>
        </Link>
      </div>

      <div className={styles.sectionLabel}>
        <span className={styles.sectionLabelText}>Campaign Info</span>
        <span className={styles.sectionLabelLine} />
      </div>

      <div className={styles.infoGrid}>
        {/* Party Members */}
        <div className={styles.infoPanel}>
          <h3 className={styles.infoPanelTitle}>Party Members</h3>

          <div className={styles.moduleSection}>
            <div className={styles.moduleSectionHeader}>
              <span className={styles.moduleSectionLabel}>Module &amp; Campaign Info</span>
              {!editingModule && (
                <button
                  type="button"
                  className={styles.btnModuleEdit}
                  onClick={() => {
                    setModuleDraft(savedModuleDescription ?? '');
                    setModuleError(null);
                    setEditingModule(true);
                  }}
                >
                  {savedModuleDescription ? 'Edit' : '+ Add'}
                </button>
              )}
            </div>

            {editingModule ? (
              <div className={styles.moduleEditForm}>
                <p className={styles.moduleHint}>
                  What module or setting are you running? Note any supplements, player kits, or
                  house rules the GM should know about.
                </p>
                <textarea
                  className={styles.moduleTextarea}
                  value={moduleDraft}
                  onChange={(e) => setModuleDraft(e.target.value)}
                  placeholder="e.g., Palace of the Silver Princess (B3), using Tasha's expanded options, no multiclassing — or describe your homebrew adventure and house rules"
                  rows={4}
                  disabled={savingModule}
                />
                {moduleError && <p className={styles.deleteError}>{moduleError}</p>}
                <div className={styles.moduleEditActions}>
                  <button
                    type="button"
                    className={styles.btnModuleSave}
                    onClick={() => void handleSaveModuleDescription()}
                    disabled={savingModule}
                  >
                    {savingModule ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className={styles.btnCancel}
                    onClick={() => setEditingModule(false)}
                    disabled={savingModule}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : savedModuleDescription ? (
              <p className={styles.moduleText}>{savedModuleDescription}</p>
            ) : (
              <p className={styles.moduleTextPlaceholder}>
                No module or campaign info set yet — the GM will ask you to describe your
                adventure as you play.
              </p>
            )}
          </div>

          {characters.length > 0 ? (
            <div className={styles.characterList}>
              {characters.map((char) => (
                <div key={char.id} className={styles.characterCard}>
                  <div className={styles.characterName}>{char.name}</div>
                  <div className={styles.characterMeta}>
                    {[char.race, char.class].filter(Boolean).join(' ')}
                    {char.level != null ? ` · Lv ${char.level}` : ''}
                  </div>
                  {char.hp != null && char.max_hp != null && (
                    <div className={styles.characterHp}>
                      {char.hp} / {char.max_hp} HP
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>No characters yet. Create one to begin.</p>
              <Link href={`/campaigns/${id}/characters/new`} className={styles.btnEmptyAction}>
                + Create Character
              </Link>
            </div>
          )}
        </div>

        {/* Session History */}
        <div className={styles.infoPanel}>
          <h3 className={styles.infoPanelTitle}>Session History</h3>
          {recentSessions.length > 0 ? (
            <div className={styles.sessionList}>
              {recentSessions.map((session) => {
                const isActive = !session.ended_at;
                // Active sessions go to the live session page; completed go to transcript viewer
                const href = isActive
                  ? `/campaigns/${id}/session`
                  : `/campaigns/${id}/sessions/${session.id}`;

                const sessionDate = new Date(session.started_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const sessionTime = new Date(session.started_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={session.id}
                    className={styles.sessionRow}
                    onClick={() => router.push(href)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      (e.key === 'Enter' || e.key === ' ') && router.push(href)
                    }
                  >
                    <span
                      className={styles.sessionStatusDot}
                      style={{ backgroundColor: isActive ? '#4a9a5a' : 'var(--ivory-dim)' }}
                    />
                    <span className={styles.sessionDate}>
                      {sessionDate} · {sessionTime}
                    </span>
                    <span className={styles.sessionDuration}>
                      {isActive ? 'Active' : formatSessionDuration(session.started_at, session.ended_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.infoPanelPlaceholder}>
              No sessions yet. Click Start Session above to begin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

