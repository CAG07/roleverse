'use client';

import ADD1ESheet from './sheets/ADD1ESheet';
import ADD2ESheet from './sheets/ADD2ESheet';
import DND5ESheet from './sheets/DND5ESheet';
import PF2ESheet from './sheets/PF2ESheet';
import DCCSheet from './sheets/DCCSheet';
import DND35ESheet from './sheets/DND35ESheet';
import DND4ESheet from './sheets/DND4ESheet';
import TOR2ESheet from './sheets/TOR2ESheet';
import Cyberpunk2020Sheet from './sheets/Cyberpunk2020Sheet';
import Fallout2D20Sheet from './sheets/Fallout2D20Sheet';
import GenericSheet from './sheets/GenericSheet';

interface DCCFunnelMember {
  id: string;
  name: string;
  occupation?: string;
  hp?: { current: number; max: number };
  ac?: number;
}

interface CharacterSheetProps {
  characterId: string;
  gameSystem: string;
  characterData: Record<string, unknown>;
  equipment?: unknown[];
  /** Raw game_data_stats JSONB blob — only consumed by sheets that write back into it (e.g. DCC Luck). */
  rawGameDataStats?: Record<string, unknown>;
  /** DCC-only: other level-0 characters run by the same player in this campaign. */
  funnelParty?: DCCFunnelMember[];
  /** Compact display for the in-session panel — see BaseSheet's `compact` doc. */
  compact?: boolean;
}

export default function CharacterSheet({
  characterId,
  gameSystem,
  characterData,
  equipment = [],
  rawGameDataStats,
  funnelParty,
  compact,
}: CharacterSheetProps) {
  switch (gameSystem) {
    case 'ADD1E':
      return (
        <ADD1ESheet characterId={characterId} data={characterData} equipment={equipment} compact={compact} />
      );
    case 'ADD2E':
      return (
        <ADD2ESheet characterId={characterId} data={characterData} equipment={equipment} compact={compact} />
      );
    case '5E_2014':
      return (
        <DND5ESheet characterId={characterId} data={characterData} equipment={equipment} compact={compact} />
      );
    case 'PATHFINDER_2E':
      return (
        <PF2ESheet characterId={characterId} data={characterData} equipment={equipment} compact={compact} />
      );
    case 'DCC':
      return (
        <DCCSheet
          characterId={characterId}
          data={{ ...characterData, equipment }}
          rawGameDataStats={rawGameDataStats}
          funnelParty={funnelParty}
          compact={compact}
        />
      );
    case '3_5E':
      return (
        <DND35ESheet characterId={characterId} data={characterData} equipment={equipment} compact={compact} />
      );
    case '4E':
      return (
        <DND4ESheet characterId={characterId} data={characterData} equipment={equipment} compact={compact} />
      );
    case 'TOR2E':
      return (
        <TOR2ESheet characterId={characterId} data={characterData} equipment={equipment} compact={compact} />
      );
    case 'CYBERPUNK_2020':
      return (
        <Cyberpunk2020Sheet
          characterId={characterId}
          data={characterData}
          equipment={equipment}
          compact={compact}
        />
      );
    case 'FALLOUT_2D20':
      return (
        <Fallout2D20Sheet
          characterId={characterId}
          data={characterData}
          equipment={equipment}
          compact={compact}
        />
      );
    default:
      return <GenericSheet data={characterData} systemName={gameSystem} equipment={equipment} />;
  }
}
