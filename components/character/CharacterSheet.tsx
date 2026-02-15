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
    case 'add-2e':
      return <ADD2ESheet data={characterData} />;
    case 'dnd-5e-2014':
      return <DND5ESheet data={characterData} />;
    default:
      return <GenericSheet data={characterData} systemName={gameSystem} />;
  }
}
