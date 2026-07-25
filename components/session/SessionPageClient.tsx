'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SessionSidebar from '@/components/session/SessionSidebar';
import SceneDisplay from '@/components/session/SceneDisplay';
import ChatWindow from '@/components/session/ChatWindow';
import CharacterSheet from '@/components/character/CharacterSheet';
import PartyStatus from '@/components/session/PartyStatus';
import SessionNotes from '@/components/session/SessionNotes';
import type { SceneMedia, PartyMember, Character, TranscriptEntry } from '@/lib/types/session';
import styles from './SessionPageClient.module.css';

// ── Component ──────────────────────────────────────────────────────────

type MobileTab = 'chat' | 'character' | 'sidebar';

type CharacterStatus = 'active' | 'unconscious' | 'dead';

// Matches PartyStatus.tsx's statusDotColor — kept in sync so the avatar strip
// and the Party Status panel always agree on what each color means.
const STATUS_DOT_COLOR: Record<CharacterStatus, string> = {
  active: '#4a9a5a',
  unconscious: '#c8873a',
  dead: '#b02020',
};

// max_hp <= 0 means HP was never entered on the character sheet (defaults to 0/0 at
// creation) — not that the character has died. Only read hp/max_hp as a health signal
// once max_hp has actually been set. hp === 0 is unconscious/dying; hp < 0 is dead.
function computeCharacterStatus(
  hp: number | null | undefined,
  maxHp: number | null | undefined
): CharacterStatus {
  const safeHp = hp ?? 0;
  const safeMaxHp = maxHp ?? 0;
  if (safeMaxHp <= 0) return 'active';
  if (safeHp < 0) return 'dead';
  if (safeHp === 0) return 'unconscious';
  return 'active';
}

export default function SessionPageClient({
  sessionId,
  campaignId,
  campaignName,
  gameSystem,
  partyMembers,
  characters,
  initialTranscript = [],
}: {
  sessionId: string;
  campaignId: string;
  campaignName: string;
  gameSystem: string;
  partyMembers: PartyMember[];
  characters: Character[];
  initialTranscript?: TranscriptEntry[];
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
    status: computeCharacterStatus(c.hp, c.max_hp),
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
                onClick={handleStopSession}
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
              campaignId={campaignId}
              initialTranscript={initialTranscript}
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
                  const dotColor = STATUS_DOT_COLOR[member.status];
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
          {selectedCharacterData && selectedCharacter ? (
            <CharacterSheet
              characterId={selectedCharacter.id}
              gameSystem={gameSystem}
              characterData={selectedCharacterData}
              equipment={selectedCharacter.equipment ?? []}
              rawGameDataStats={selectedCharacter.game_data_stats ?? {}}
            />
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

