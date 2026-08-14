'use client';

import ADD1ESheet from './sheets/ADD1ESheet';
import ADD2ESheet from './sheets/ADD2ESheet';
import DND5ESheet from './sheets/DND5ESheet';
import PF2ESheet from './sheets/PF2ESheet';
import DCCSheet from './sheets/DCCSheet';
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
    default:
      return <GenericSheet data={characterData} systemName={gameSystem} equipment={equipment} />;
  }
}
