'use client';

import { useState } from 'react';
import { MessageSquare, User, Sidebar } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

const avatarColors = ['bg-teal', 'bg-rust', 'bg-gold'];

const mockCharacters: Record<string, Record<string, unknown>> = {
  '1': {
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
  },
  '2': {
    name: 'Elara Moonshadow',
    race: 'High Elf',
    class: 'Wizard',
    subclass: 'School of Evocation',
    level: 5,
    background: 'Sage',
    alignment: 'Chaotic Good',
    proficiencyBonus: 3,
    ac: 13,
    hp: 22,
    maxHp: 28,
    hitDice: '5d6',
    abilityScores: { Strength: 8, Dexterity: 14, Constitution: 12, Intelligence: 18, Wisdom: 13, Charisma: 10 },
    savingThrowProficiencies: ['Intelligence', 'Wisdom'],
    skillProficiencies: ['Arcana', 'History', 'Investigation', 'Perception'],
    features: ['Arcane Recovery', 'Evocation Savant', 'Sculpt Spells'],
    spellSaveDC: 14,
    spellAttackModifier: 6,
    spellSlots: { '1': 4, '2': 3, '3': 2 },
  },
  '3': {
    name: 'Grog the Mighty',
    race: 'Half-Orc',
    class: 'Barbarian',
    subclass: 'Path of the Berserker',
    level: 5,
    background: 'Outlander',
    alignment: 'Chaotic Neutral',
    proficiencyBonus: 3,
    ac: 15,
    hp: 0,
    maxHp: 67,
    hitDice: '5d12',
    abilityScores: { Strength: 20, Dexterity: 14, Constitution: 18, Intelligence: 8, Wisdom: 10, Charisma: 12 },
    savingThrowProficiencies: ['Strength', 'Constitution'],
    skillProficiencies: ['Athletics', 'Intimidation', 'Survival', 'Animal Handling'],
    features: ['Rage', 'Reckless Attack', 'Danger Sense', 'Extra Attack', 'Frenzy'],
    spellSaveDC: null,
  },
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
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const tabButtonClass = (tab: MobileTab) =>
    `flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medieval transition-colors ${
      mobileTab === tab
        ? 'bg-brown text-gold border-b-2 border-gold'
        : 'bg-brown-dark text-cream/50 hover:text-cream/80'
    }`;

  const selectedCharacter = selectedCharacterId ? mockCharacters[selectedCharacterId] : null;

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

        {/* Center column — flex-1, split vertically: scene 2/3, chat 1/3 */}
        <div
          className={`flex flex-1 flex-col overflow-hidden ${
            mobileTab === 'chat' ? 'flex' : 'hidden'
          } md:flex`}
        >
          {/* Scene display (top ~2/3) */}
          <div className={`p-2 pb-0 ${sceneMedia ? 'flex-[2] min-h-0' : 'hidden'}`}>
            <SceneDisplay media={sceneMedia} onClose={() => setSceneMedia(null)} />
          </div>

          {/* Chat (bottom ~1/3, or full height when no scene) */}
          <div className={`flex flex-col overflow-hidden p-2 ${sceneMedia ? 'flex-1 min-h-0' : 'flex-1'}`}>
            <ChatWindow onSceneMediaUpdate={setSceneMedia} />
          </div>
        </div>

        {/* Right panel ~320px */}
        <div
          className={`w-80 shrink-0 flex-col overflow-y-auto border-l-2 border-gold bg-brown p-3 ${
            mobileTab === 'character' ? 'flex' : 'hidden'
          } md:flex`}
        >
          {/* PC avatar buttons */}
          <div className="mb-3">
            <h3 className="mb-2 font-medieval text-sm text-gold">Party</h3>
            <div className="flex gap-2">
              {mockPartyStatus.map((member, i) => {
                const initials = member.characterName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2);
                const isSelected = selectedCharacterId === member.id;
                return (
                  <button
                    key={member.id}
                    onClick={() =>
                      setSelectedCharacterId(isSelected ? null : member.id)
                    }
                    className={`group relative flex flex-col items-center gap-1 rounded p-1.5 transition-colors ${
                      isSelected
                        ? 'bg-gold/20 ring-2 ring-gold'
                        : 'hover:bg-brown-dark/50'
                    }`}
                    title={member.characterName}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback
                        className={`${avatarColors[i % avatarColors.length]} text-xs font-bold text-cream`}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[60px] truncate text-[10px] text-cream/60">
                      {member.characterName.split(' ')[0]}
                    </span>
                    {/* HP indicator dot */}
                    <span
                      className={`absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border border-brown ${
                        member.status === 'active'
                          ? 'bg-green-500'
                          : member.status === 'unconscious'
                            ? 'bg-amber-400'
                            : 'bg-red-500'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Character sheet (shown when a PC is selected) */}
          {selectedCharacter ? (
            <div className="mb-3">
              <CharacterSheet gameSystem={gameSystem} characterData={selectedCharacter} />
            </div>
          ) : (
            <div className="mb-3 rounded border border-gold/20 bg-brown-dark/30 p-4 text-center">
              <User className="mx-auto mb-2 h-8 w-8 text-cream/20" />
              <p className="text-xs text-cream/40">
                Select a character above to view their sheet
              </p>
            </div>
          )}

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
