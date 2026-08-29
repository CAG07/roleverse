// lib/oracle/quick-npc-generator.ts
// "Quick NPC" — a one-roll role + disposition + quirk seed for deciding who
// an on-the-spot NPC is, instead of asking a string of broad oracle
// questions about them first (from the solo-RPG-community thread:
// EdgeOfDreams' technique of skipping "does this NPC know anything" and
// jumping straight to "what kind of person knows this"). Ephemeral, like
// Plot Seed — does NOT write to the NPC roster; that stays a chat-specific,
// confirm-only path (flagNpc, see npc-model.md). Reuses NpcDisposition for
// vocabulary consistency with the real roster, nothing more.
//
// Same pure, side-effect-free shape as builtin-oracle.ts.

import type { NpcDisposition } from '@/lib/types/npc';

export interface QuickNpc {
  role: string;
  disposition: NpcDisposition;
  quirk: string;
}

const ROLE_TABLE = [
  'a merchant', 'a guard', 'a scholar', 'a laborer', 'a wanderer', 'a noble',
  'a criminal', 'a priest', 'an artisan', 'a hunter', 'a soldier', 'a healer',
  'a servant', 'a sailor', 'an official', 'an entertainer',
];

const DISPOSITIONS: NpcDisposition[] = ['friendly', 'helpful', 'neutral', 'wary', 'hostile'];

const QUIRK_TABLE = [
  'speaks in short, clipped sentences',
  "can't stop fidgeting",
  'is overly formal with everyone',
  'is suspicious of strangers',
  'is unusually cheerful',
  'has a nervous laugh',
  'talks about the weather constantly',
  'avoids eye contact',
  'repeats themselves when nervous',
  'is blunt to the point of rudeness',
  'seems distracted by something else entirely',
  'is eager to please',
];

function pick<T>(table: T[], rng: () => number): T {
  return table[Math.floor(rng() * table.length)];
}

/** Generate a one-roll NPC seed. `rng` defaults to Math.random but can be
 *  injected for deterministic tests — must return a value in [0, 1). */
export function generateQuickNpc(rng: () => number = Math.random): QuickNpc {
  return {
    role: pick(ROLE_TABLE, rng),
    disposition: pick(DISPOSITIONS, rng),
    quirk: pick(QUIRK_TABLE, rng),
  };
}

export function formatQuickNpc(npc: QuickNpc): string {
  return `${npc.role}, ${npc.disposition}, who ${npc.quirk}`;
}
