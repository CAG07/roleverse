'use client';
import { createContext, useContext } from 'react';
import type { GameDataColumn } from './character-updates';

/** Optional hook a host page (session panel, character detail page) provides so a
 *  sheet panel that saves one key of a JSONB column (e.g. the Spell Book) can tell
 *  that page about it — the same idea as hp-update-context.ts. Undefined means
 *  "no local state to patch here." */
export type CharacterDataUpdateCallback = (
  characterId: string,
  column: GameDataColumn,
  key: string,
  value: unknown
) => void;

export const CharacterDataUpdateContext = createContext<CharacterDataUpdateCallback | undefined>(undefined);

export function useCharacterDataUpdate(): CharacterDataUpdateCallback | undefined {
  return useContext(CharacterDataUpdateContext);
}
