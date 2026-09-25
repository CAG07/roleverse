'use client';
import { createContext, useContext } from 'react';

/** Optional hook a host page (session panel, character detail page) provides so
 *  BaseSheet's inline HP editor can propagate a successful save back up to
 *  whatever local character state that page keeps — without every per-system
 *  sheet component needing to know this exists. Undefined means "no local
 *  state to patch here." */
export type HpUpdateCallback = (characterId: string, hp: number) => void;

export const HpUpdateContext = createContext<HpUpdateCallback | undefined>(undefined);

export function useHpUpdate(): HpUpdateCallback | undefined {
  return useContext(HpUpdateContext);
}
