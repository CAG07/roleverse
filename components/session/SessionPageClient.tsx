'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SessionSidebar from '@/components/session/SessionSidebar';
import SceneDisplay from '@/components/session/SceneDisplay';
import ChatWindow from '@/components/session/ChatWindow';
import CharacterSheet from '@/components/character/CharacterSheet';
import PartyStatus from '@/components/session/PartyStatus';
import SessionNotes from '@/components/session/SessionNotes';
import type { SceneMedia, PartyMember, Character } from '@/lib/types/session';
import styles from './SessionPageClient.module.css';

// ── Component ──────────────────────────────────────────────────────────

type MobileTab = 'chat' | 'character' | 'sidebar';

export default function SessionPageClient({
  sessionId,
  campaignId,
  campaignName,
  gameSystem,
  partyMembers,
  characters,
}: {
  sessionId: string;
  campaignId: string;
  campaignName: string;
  gameSystem: string;
  partyMembers: PartyMember[];
  characters: Character[];
}) {
  const router = useRouter();
  const [sceneMedia, setSceneMedia] = useState<SceneMedia | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId) ?? null;

  const handleStopSession = useCallback(async () => {
    setIsStopping(true);
    try {
      await fetch(`/api/sessions/${sessionId}/end`, { method: 'POST' });
    } finally {
      setIsStopping(false);
      router.push(`/campaigns/${campaignId}`);
    }
  }, [sessionId, campaignId, router]);

  // Build party nav entries for SessionSidebar
  const partyNav = partyMembers.map((m) => ({
    id: m.id,
    name: m.display_name ?? m.user_id,
    role: m.role,
  }));

  // Build party status entries for PartyStatus
  const partyStatus = characters.map((c) => ({
    id: c.id,
    characterName: c.name,
    characterClass: c.class ?? 'Unknown',
    currentHp: c.hp ?? 0,
    maxHp: c.max_hp ?? 0,
    status: (c.hp ?? 0) <= 0 ? ('unconscious' as const) : ('active' as const),
  }));

  // Build character data record for CharacterSheet
  const selectedCharacterData: Record<string, unknown> | null = selectedCharacter
    ? {
        name: selectedCharacter.name,
        race: selectedCharacter.race,
        class: selectedCharacter.class,
        level: selectedCharacter.level,
        hp: selectedCharacter.hp,
        maxHp: selectedCharacter.max_hp,
        ...((selectedCharacter.game_data_stats as Record<string, unknown> | null | undefined) ?? {}),
        ...((selectedCharacter.game_data_combat as Record<string, unknown> | null | undefined) ?? {}),
      }
    : null;

  return (
    <div className={styles.sessionRoot}>
      {/* Confirm Stop Session dialog */}
      {confirmStop && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <p className={styles.confirmText}>End this session?</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.btnConfirmStop}
                onClick={() => { void handleStopSession(); }}
                disabled={isStopping}
                type="button"
              >
                {isStopping ? 'Ending…' : 'End Session'}
              </button>
              <button
                className={styles.btnCancel}
                onClick={() => setConfirmStop(false)}
                disabled={isStopping}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile tab bar */}
      <div className={styles.mobileTabs}>
        <button
          className={`${styles.tabBtn}${mobileTab === 'sidebar' ? ` ${styles.active}` : ''}`}
          onClick={() => setMobileTab('sidebar')}
        >
          ≡ Session
        </button>
        <button
          className={`${styles.tabBtn}${mobileTab === 'chat' ? ` ${styles.active}` : ''}`}
          onClick={() => setMobileTab('chat')}
        >
          ✦ Chat
        </button>
        <button
          className={`${styles.tabBtn}${mobileTab === 'character' ? ` ${styles.active}` : ''}`}
          onClick={() => setMobileTab('character')}
        >
          ◆ Character
        </button>
      </div>

      {/* Three-column layout */}
      <div className={styles.sessionColumns}>
        {/* Left sidebar */}
        <div className={`${styles.colSidebar}${mobileTab === 'sidebar' ? ` ${styles.mobileActive}` : ''}`}>
          <SessionSidebar
            campaignName={campaignName}
            gameSystem={gameSystem}
            partyMembers={partyNav}
            isDM
            campaignId={campaignId}
            onStopSession={() => setConfirmStop(true)}
          />
        </div>

        {/* Center column */}
        <div className={`${styles.colCenter}${mobileTab === 'chat' ? ` ${styles.mobileActive}` : ''}`}>
          <div className={styles.scenePanel}>
            <SceneDisplay media={sceneMedia} onClose={() => setSceneMedia(null)} />
          </div>
          <div className={styles.chatPanel}>
            <ChatWindow
              onSceneMediaUpdate={setSceneMedia}
              sessionId={sessionId}
            />
          </div>
        </div>

        {/* Right panel */}
        <div className={`${styles.colRight}${mobileTab === 'character' ? ` ${styles.mobileActive}` : ''}`}>
          {/* Party avatar selector */}
          <div>
            <div className={styles.sectionLabel}>Party</div>
            {characters.length === 0 ? (
              <p className={styles.noCharacterText}>No characters in this campaign yet.</p>
            ) : (
              <div className={styles.partyAvatars}>
                {partyStatus.map((member) => {
                  const initials = member.characterName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2);
                  const isSelected = selectedCharacterId === member.id;
                  const dotColor =
                    member.status === 'active' ? '#4a9a5a' : '#c8873a';
                  return (
                    <button
                      key={member.id}
                      className={`${styles.avatarBtn}${isSelected ? ` ${styles.selected}` : ''}`}
                      onClick={() => setSelectedCharacterId(isSelected ? null : member.id)}
                      title={member.characterName}
                      type="button"
                    >
                      <div className={styles.avatarCircle}>{initials}</div>
                      <span className={styles.avatarName}>{member.characterName.split(' ')[0]}</span>
                      <span className={styles.hpDot} style={{ backgroundColor: dotColor }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Character sheet */}
          {selectedCharacterData ? (
            <CharacterSheet gameSystem={gameSystem} characterData={selectedCharacterData} />
          ) : (
            <div className={styles.noCharacter}>
              <p className={styles.noCharacterText}>
                {characters.length === 0
                  ? 'No characters in this campaign yet.'
                  : 'Select a character above to view their sheet'}
              </p>
            </div>
          )}

          <div className={styles.panelDivider} />
          {partyStatus.length > 0 ? (
            <PartyStatus members={partyStatus} />
          ) : (
            <p className={styles.noCharacterText}>No party members besides the DM yet.</p>
          )}
          <div className={styles.panelDivider} />
          <SessionNotes campaignId={campaignId} />
        </div>
      </div>
    </div>
  );
}

