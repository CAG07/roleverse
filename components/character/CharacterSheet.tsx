'use client';

import ADD2ESheet from './sheets/ADD2ESheet';
import DND5ESheet from './sheets/DND5ESheet';
import GenericSheet from './sheets/GenericSheet';

interface CharacterSheetProps {
  gameSystem: string;
  characterData: Record<string, unknown>;
}

export default function CharacterSheet({ gameSystem, characterData }: CharacterSheetProps) {
  switch (gameSystem) {
    case 'ADD2E':
      return <ADD2ESheet data={characterData} />;
    case '5E_2014':
      return <DND5ESheet data={characterData} />;
    default:
      return <GenericSheet data={characterData} systemName={gameSystem} />;
  }
}
