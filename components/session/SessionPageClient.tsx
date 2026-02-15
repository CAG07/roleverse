'use client';

import { useState } from 'react';
import { Menu, X, MessageSquare, User, Sidebar } from 'lucide-react';
import SessionSidebar from '@/components/session/SessionSidebar';
import SceneDisplay from '@/components/session/SceneDisplay';
import ChatWindow from '@/components/session/ChatWindow';
import CharacterSheet from '@/components/character/CharacterSheet';
import PartyStatus from '@/components/session/PartyStatus';
import SessionNotes from '@/components/session/SessionNotes';
import type { SceneMedia } from '@/lib/types/session';

// ── Mock data for testing ──────────────────────────────────────────────

const mockPartyNav = [
  { id: '1', name: 'Thorin Ironforge', role: 'dm' as const },
  { id: '2', name: 'Elara Moonshadow', role: 'player' as const },
  { id: '3', name: 'Grog the Mighty', role: 'player' as const },
];

const mockPartyStatus = [
  { id: '1', characterName: 'Thorin Ironforge', characterClass: 'Fighter', currentHp: 45, maxHp: 52, status: 'active' as const },
  { id: '2', characterName: 'Elara Moonshadow', characterClass: 'Wizard', currentHp: 22, maxHp: 28, status: 'active' as const },
  { id: '3', characterName: 'Grog the Mighty', characterClass: 'Barbarian', currentHp: 0, maxHp: 67, status: 'unconscious' as const },
];

const mockCharacter: Record<string, unknown> = {
  name: 'Thorin Ironforge',
  race: 'Mountain Dwarf',
  class: 'Fighter',
  subclass: 'Champion',
  level: 5,
  background: 'Soldier',
  alignment: 'Lawful Good',
  proficiencyBonus: 3,
  ac: 18,
  hp: 45,
  maxHp: 52,
  hitDice: '5d10',
  abilityScores: { Strength: 18, Dexterity: 12, Constitution: 16, Intelligence: 10, Wisdom: 13, Charisma: 8 },
  savingThrowProficiencies: ['Strength', 'Constitution'],
  skillProficiencies: ['Athletics', 'Intimidation', 'Perception', 'Survival'],
  features: ['Second Wind', 'Action Surge', 'Improved Critical', 'Extra Attack'],
  spellSaveDC: null,
};

// ── Component ──────────────────────────────────────────────────────────

type MobileTab = 'chat' | 'character' | 'sidebar';

export default function SessionPageClient({
  campaignId,
  campaignName,
  gameSystem,
}: {
  campaignId: string;
  campaignName: string;
  gameSystem: string;
}) {
  const [sceneMedia, setSceneMedia] = useState<SceneMedia | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');

  const tabButtonClass = (tab: MobileTab) =>
    `flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medieval transition-colors ${
      mobileTab === tab
        ? 'bg-brown text-gold border-b-2 border-gold'
        : 'bg-brown-dark text-cream/50 hover:text-cream/80'
    }`;

  return (
    <div className="flex h-screen flex-col bg-brown-dark">
      {/* Mobile tab bar */}
      <div className="flex border-b border-gold/30 md:hidden">
        <button onClick={() => setMobileTab('sidebar')} className={tabButtonClass('sidebar')}>
          <Sidebar className="h-4 w-4" />
          Session
        </button>
        <button onClick={() => setMobileTab('chat')} className={tabButtonClass('chat')}>
          <MessageSquare className="h-4 w-4" />
          Chat
        </button>
        <button onClick={() => setMobileTab('character')} className={tabButtonClass('character')}>
          <User className="h-4 w-4" />
          Character
        </button>
      </div>

      {/* Desktop three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar ~240px */}
        <div
          className={`w-60 shrink-0 ${
            mobileTab === 'sidebar' ? 'flex' : 'hidden'
          } md:flex`}
        >
          <SessionSidebar
            campaignName={campaignName}
            gameSystem={gameSystem}
            partyMembers={mockPartyNav}
            isDM
            campaignId={campaignId}
          />
        </div>

        {/* Center column — flex-1 */}
        <div
          className={`flex flex-1 flex-col overflow-hidden ${
            mobileTab === 'chat' ? 'flex' : 'hidden'
          } md:flex`}
        >
          {/* Scene display (top) */}
          {sceneMedia && (
            <div className="shrink-0 p-2">
              <SceneDisplay media={sceneMedia} onClose={() => setSceneMedia(null)} />
            </div>
          )}

          {/* Chat (bottom, expands to fill) */}
          <div className="flex flex-1 flex-col overflow-hidden p-2 pt-0">
            <ChatWindow onSceneMediaUpdate={setSceneMedia} />
          </div>
        </div>

        {/* Right panel ~320px */}
        <div
          className={`w-80 shrink-0 flex-col overflow-y-auto border-l-2 border-gold bg-brown p-3 ${
            mobileTab === 'character' ? 'flex' : 'hidden'
          } md:flex`}
        >
          {/* Character sheet */}
          <div className="mb-3">
            <h3 className="mb-2 font-medieval text-sm text-gold">Character Sheet</h3>
            <CharacterSheet gameSystem={gameSystem} characterData={mockCharacter} />
          </div>

          {/* Divider */}
          <hr className="my-2 border-gold/20" />

          {/* Party status */}
          <PartyStatus members={mockPartyStatus} />

          {/* Divider */}
          <hr className="my-2 border-gold/20" />

          {/* Session Notes */}
          <SessionNotes campaignId={campaignId} />
        </div>
      </div>
    </div>
  );
}
