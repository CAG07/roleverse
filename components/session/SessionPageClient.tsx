'use client';

import { useState } from 'react';
import SessionSidebar from '@/components/session/SessionSidebar';
import SceneDisplay from '@/components/session/SceneDisplay';
import ChatWindow from '@/components/session/ChatWindow';
import CharacterSheet from '@/components/character/CharacterSheet';
import PartyStatus from '@/components/session/PartyStatus';
import SessionNotes from '@/components/session/SessionNotes';
import type { SceneMedia, PartyMember, Character } from '@/lib/types/session';

// ── Component ──────────────────────────────────────────────────────────

type MobileTab = 'chat' | 'character' | 'sidebar';

export default function SessionPageClient({
  campaignId,
  campaignName,
  gameSystem,
  partyMembers,
  characters,
}: {
  campaignId: string;
  campaignName: string;
  gameSystem: string;
  partyMembers: PartyMember[];
  characters: Character[];
}) {
  const [sceneMedia, setSceneMedia] = useState<SceneMedia | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId) ?? null;

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
    <div className="session-root">
      <style jsx>{`
        .session-root {
          display: flex;
          height: 100vh;
          flex-direction: column;
          background: var(--void);
          overflow: hidden;
        }

        /* Mobile tab bar */
        .mobile-tabs {
          display: flex;
          border-bottom: var(--rule-thin);
        }
        @media (min-width: 768px) {
          .mobile-tabs { display: none; }
        }

        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.5rem;
          background: var(--void-mid);
          border: none;
          font-family: var(--font-heading);
          font-size: 0.625rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ivory-dim);
          cursor: pointer;
          transition: all 0.15s;
        }
        .tab-btn.active {
          background: var(--void-surface);
          color: var(--gold);
          border-bottom: 2px solid var(--crimson);
        }

        /* Three-column layout */
        .session-columns {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* Left sidebar */
        .col-sidebar {
          width: 240px;
          flex-shrink: 0;
          display: none;
        }
        .col-sidebar.mobile-active { display: flex; }
        @media (min-width: 768px) {
          .col-sidebar { display: flex !important; }
        }

        /* Center column */
        .col-center {
          flex: 1;
          display: none;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }
        .col-center.mobile-active { display: flex; }
        @media (min-width: 768px) {
          .col-center { display: flex !important; }
        }

        /* Scene panel */
        .scene-panel {
          height: 42%;
          flex-shrink: 0;
          padding: 0.5rem 0.5rem 0;
          position: relative;
        }

        /* Chat panel */
        .chat-panel {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          padding: 0.5rem;
          overflow: hidden;
        }

        /* Right panel */
        .col-right {
          width: 320px;
          flex-shrink: 0;
          display: none;
          flex-direction: column;
          overflow-y: auto;
          background: var(--void-mid);
          border-left: var(--rule-thin);
          padding: 0.75rem;
          gap: 0.75rem;
        }
        .col-right.mobile-active { display: flex; }
        @media (min-width: 768px) {
          .col-right { display: flex !important; }
        }

        /* Section label */
        .section-label {
          font-family: var(--font-heading);
          font-size: 0.575rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 0.375rem;
        }

        /* Party avatar buttons */
        .party-avatars {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .avatar-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem;
          background: none;
          border: 1px solid var(--void-border);
          cursor: pointer;
          transition: all 0.15s;
          position: relative;
        }
        .avatar-btn:hover {
          border-color: var(--crimson-dim);
          background: var(--void-surface);
        }
        .avatar-btn.selected {
          border-color: var(--gold);
          background: rgba(184, 136, 42, 0.08);
        }
        .avatar-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-heading);
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--ivory);
          background: var(--crimson-dim);
          border: 1px solid var(--crimson);
        }
        .avatar-name {
          font-family: var(--font-body);
          font-size: 0.625rem;
          color: var(--ivory-muted);
          max-width: 52px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .hp-dot {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid var(--void-mid);
        }

        /* No character selected */
        .no-character {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: var(--surface-card);
          border: var(--rule-thin);
          text-align: center;
        }
        .no-character-text {
          font-family: var(--font-body);
          font-size: 0.775rem;
          color: var(--ivory-dim);
        }

        /* Divider */
        .panel-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--crimson-dim), transparent);
        }
      `}</style>

      {/* Mobile tab bar */}
      <div className="mobile-tabs">
        <button
          className={`tab-btn${mobileTab === 'sidebar' ? ' active' : ''}`}
          onClick={() => setMobileTab('sidebar')}
        >
          ≡ Session
        </button>
        <button
          className={`tab-btn${mobileTab === 'chat' ? ' active' : ''}`}
          onClick={() => setMobileTab('chat')}
        >
          ✦ Chat
        </button>
        <button
          className={`tab-btn${mobileTab === 'character' ? ' active' : ''}`}
          onClick={() => setMobileTab('character')}
        >
          ◆ Character
        </button>
      </div>

      {/* Three-column layout */}
      <div className="session-columns">
        {/* Left sidebar */}
        <div className={`col-sidebar${mobileTab === 'sidebar' ? ' mobile-active' : ''}`}>
          <SessionSidebar
            campaignName={campaignName}
            gameSystem={gameSystem}
            partyMembers={partyNav}
            isDM
            campaignId={campaignId}
          />
        </div>

        {/* Center column */}
        <div className={`col-center${mobileTab === 'chat' ? ' mobile-active' : ''}`}>
          <div className="scene-panel">
            <SceneDisplay media={sceneMedia} onClose={() => setSceneMedia(null)} />
          </div>
          <div className="chat-panel">
            <ChatWindow
              onSceneMediaUpdate={setSceneMedia}
              campaignId={campaignId}
              gameSystem={gameSystem}
            />
          </div>
        </div>

        {/* Right panel */}
        <div className={`col-right${mobileTab === 'character' ? ' mobile-active' : ''}`}>
          {/* Party avatar selector */}
          <div>
            <div className="section-label">Party</div>
            {characters.length === 0 ? (
              <p className="no-character-text">No characters in this campaign yet.</p>
            ) : (
              <div className="party-avatars">
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
                      className={`avatar-btn${isSelected ? ' selected' : ''}`}
                      onClick={() => setSelectedCharacterId(isSelected ? null : member.id)}
                      title={member.characterName}
                      type="button"
                    >
                      <div className="avatar-circle">{initials}</div>
                      <span className="avatar-name">{member.characterName.split(' ')[0]}</span>
                      <span className="hp-dot" style={{ backgroundColor: dotColor }} />
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
            <div className="no-character">
              <p className="no-character-text">
                {characters.length === 0
                  ? 'No characters in this campaign yet.'
                  : 'Select a character above to view their sheet'}
              </p>
            </div>
          )}

          <div className="panel-divider" />
          {partyStatus.length > 0 ? (
            <PartyStatus members={partyStatus} />
          ) : (
            <p className="no-character-text">No party members besides the DM yet.</p>
          )}
          <div className="panel-divider" />
          <SessionNotes campaignId={campaignId} />
        </div>
      </div>
    </div>
  );
}

