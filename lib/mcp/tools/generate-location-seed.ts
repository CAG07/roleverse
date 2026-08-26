// lib/mcp/tools/generate-location-seed.ts
// Table-driven procedural location seed for sandbox play with no uploaded
// module to ground the scene — deterministic dice-style generation, never
// free-form LLM invention of structure. Used by update-location.ts's
// fallback when nothing else grounds the current area.
//
// Pure and side-effect-free by design, same shape as lib/oracle/builtin-oracle.ts:
// no I/O, no Anthropic call. `rng` is injectable for deterministic testing.

export interface GeneratedLocationSeed {
  terrain: string;
  features: string[];
  exitCount: number;
}

const TERRAIN_TABLE = [
  'dense forest clearing',
  'rocky hillside',
  'marshland',
  'ruined stone structure',
  'narrow cave passage',
  'overgrown trail',
  'abandoned campsite',
  'dry riverbed',
  'crumbling watchtower',
  'moss-covered ruins',
  'open grassland',
  'sheer cliff face',
  'shallow underground chamber',
  'derelict building interior',
];

const FEATURE_TABLE = [
  'a fallen tree blocking part of the way',
  'strange claw marks on a nearby surface',
  'the remains of an old campfire',
  'a half-buried statue',
  'fresh animal tracks',
  'an unnatural silence',
  'a faint, unpleasant odor',
  'scattered bones',
  'a patch of unusually vivid fungus or moss',
  'a rusted piece of old equipment or weaponry',
  'a trickle of water from somewhere unseen',
  'strange carvings on a rock or wall',
  'a swarm of insects',
  'an eerie draft with no obvious source',
  'signs of a recent struggle',
  'a partially collapsed section',
];

function rollD(sides: number, rng: () => number): number {
  return Math.floor(rng() * sides) + 1;
}

function pick<T>(table: T[], rng: () => number): T {
  return table[Math.floor(rng() * table.length)];
}

/**
 * Generate a structured, non-prose location seed. `rng` defaults to
 * Math.random but can be injected for deterministic tests — must return a
 * value in [0, 1).
 */
export function generateLocationSeed(rng: () => number = Math.random): GeneratedLocationSeed {
  const terrain = pick(TERRAIN_TABLE, rng);

  const featureCount = rollD(3, rng); // 1-3 features
  const features = new Set<string>();
  while (features.size < featureCount) {
    features.add(pick(FEATURE_TABLE, rng));
  }

  const exitCount = rollD(4, rng); // 1-4 exits

  return { terrain, features: Array.from(features), exitCount };
}
