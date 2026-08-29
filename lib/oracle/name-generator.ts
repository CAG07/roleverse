// lib/oracle/name-generator.ts
// Random name generator — a common companion utility in solo-play toolkits
// (need an NPC name on the spot). Deliberately one generic fantasy-flavored
// table rather than per-game-system (RoleVerse spans 5E through Cyberpunk
// 2020) — a known scope limit, not a gap this generator tries to solve.
// Same pure, side-effect-free shape as builtin-oracle.ts.

const FIRST_NAMES = [
  'Aldric', 'Brynn', 'Corwin', 'Dessa', 'Edrin', 'Fenna', 'Garrick', 'Helwyn',
  'Isolde', 'Joren', 'Kessa', 'Lucan', 'Mireille', 'Nolan', 'Orin', 'Pella',
  'Quen', 'Roswen', 'Soren', 'Talia', 'Ulric', 'Vesna', 'Wren', 'Yorick',
];

const SURNAMES = [
  'Ashford', 'Blackwood', 'Corrin', 'Duskwatch', 'Emberfall', 'Fairweather',
  'Graves', 'Hollowmere', 'Ironside', 'Justice', 'Kettleborn', 'Longmarch',
  'Marrow', 'Nightshade', 'Oakhart', 'Pemberly', 'Quickwater', 'Ravensworth',
  'Stonebridge', 'Thorne', 'Underhill', 'Vane', 'Wintermere', 'Yarrow',
];

function pick<T>(table: T[], rng: () => number): T {
  return table[Math.floor(rng() * table.length)];
}

/** Generate a random first + surname. `rng` defaults to Math.random but can
 *  be injected for deterministic tests — must return a value in [0, 1). */
export function generateName(rng: () => number = Math.random): string {
  return `${pick(FIRST_NAMES, rng)} ${pick(SURNAMES, rng)}`;
}
