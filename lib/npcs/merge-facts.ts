// lib/npcs/merge-facts.ts
// Shared known_facts merge/dedupe logic. Used by manual CRUD (PATCH route),
// transcript extraction, and structured import — all append-only writers
// need the same case-insensitive substring dedupe so facts don't pile up
// duplicates across sessions.

import type { NpcKnownFact } from '@/lib/types/npc';

function isDuplicateFact(existing: NpcKnownFact[], factText: string): boolean {
  const lowerIncoming = factText.toLowerCase();
  return existing.some((ef) => {
    const lowerExisting = ef.fact.toLowerCase();
    return lowerExisting.includes(lowerIncoming) || lowerIncoming.includes(lowerExisting);
  });
}

/** Appends incoming facts onto existing, skipping any that are a case-insensitive substring match. */
export function mergeKnownFacts(
  existing: NpcKnownFact[],
  incoming: NpcKnownFact[]
): NpcKnownFact[] {
  const merged = [...existing];
  for (const fact of incoming) {
    if (!isDuplicateFact(merged, fact.fact)) {
      merged.push(fact);
    }
  }
  return merged;
}
