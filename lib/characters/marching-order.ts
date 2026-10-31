// lib/characters/marching-order.ts
// The party's marching order: ranks of two, front to back, saved on
// campaigns.marching_order as [["<character id>", "<character id>" | null], ...].
// Set by dragging the Party Status boxes during a session
// (components/session/PartyStatus.tsx) and shown to the Game Master every
// turn (lib/mcp/context/party-context.ts).

export const RANK_SIZE = 2;

/** One rank: character ids, null for an empty place. */
export type MarchingRank = (string | null)[];
export type MarchingOrder = MarchingRank[];

/**
 * Reconciles a saved order with the campaign's current characters: drops
 * characters that no longer exist and repeats, drops ranks left empty, and
 * adds characters missing from the order at the rear (filling the last rank's
 * empty place first). With nothing saved, the party fills ranks in the given order.
 */
export function normalizeMarchingOrder(saved: unknown, characterIds: string[]): MarchingOrder {
  const known = new Set(characterIds);
  const placed = new Set<string>();

  const ranks: MarchingOrder = [];
  if (Array.isArray(saved)) {
    for (const rawRank of saved) {
      if (!Array.isArray(rawRank)) continue;
      const rank: MarchingRank = [];
      for (let i = 0; i < RANK_SIZE; i++) {
        const id = rawRank[i];
        if (typeof id === 'string' && known.has(id) && !placed.has(id)) {
          placed.add(id);
          rank.push(id);
        } else {
          rank.push(null);
        }
      }
      if (rank.some((id) => id !== null)) ranks.push(rank);
    }
  }

  for (const id of characterIds) {
    if (placed.has(id)) continue;
    placed.add(id);
    const last = ranks[ranks.length - 1];
    const empty = last ? last.indexOf(null) : -1;
    if (last && empty !== -1) last[empty] = id;
    else ranks.push([id, ...Array<null>(RANK_SIZE - 1).fill(null)]);
  }

  return ranks;
}

export interface SlotPosition {
  rank: number;
  place: number;
}

/**
 * Swaps two places (either may be empty, or in an extra empty rank just past
 * the rear), then tidies the result so no empty rank is left behind.
 */
export function swapPlaces(order: MarchingOrder, a: SlotPosition, b: SlotPosition): MarchingOrder {
  const rankCount = Math.max(order.length, a.rank + 1, b.rank + 1);
  const next: MarchingOrder = Array.from({ length: rankCount }, (_, i) =>
    order[i] ? [...order[i]] : Array<null>(RANK_SIZE).fill(null)
  );
  const first = next[a.rank][a.place] ?? null;
  next[a.rank][a.place] = next[b.rank][b.place] ?? null;
  next[b.rank][b.place] = first;
  return next.filter((rank) => rank.some((id) => id !== null));
}

/** "Rank 1 (front): Raybay and Enos" lines for the Game Master's prompt. */
export function formatMarchingOrder(order: MarchingOrder, nameOf: (id: string) => string | undefined): string {
  return order
    .map((rank, i) => {
      const names = rank.filter((id): id is string => id !== null).map((id) => nameOf(id) ?? 'Unknown');
      const label =
        i === 0 ? `Rank 1 (front)` : i === order.length - 1 ? `Rank ${i + 1} (rear)` : `Rank ${i + 1}`;
      return `- ${label}: ${names.join(' and ')}`;
    })
    .join('\n');
}
