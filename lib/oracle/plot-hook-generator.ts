// lib/oracle/plot-hook-generator.ts
// "Plot Seed" — zero-AI, client-side plot-hook generator for sandbox play
// with no prewritten adventure. Same pure, side-effect-free shape as
// builtin-oracle.ts: no I/O, no Anthropic call, runs entirely client-side.
// `rng` is injectable for deterministic testing.

export interface PlotHook {
  subject: string;
  need: string;
  complication: string;
}

const SUBJECT_TABLE = [
  'A frightened merchant',
  'A local elder',
  'A wounded traveler',
  'A desperate parent',
  'A disgraced noble',
  'A wandering priest',
  'An old rival',
  'A mysterious stranger',
  'A retired adventurer',
  'A village official',
  'A captured scout',
  'An anonymous letter, left behind',
];

const NEED_TABLE = [
  'needs something retrieved from a dangerous place',
  'is being blackmailed and needs protection',
  'has gone missing under strange circumstances',
  'needs an escort through hostile territory',
  'is searching for a lost family member',
  'wants revenge against someone powerful',
  'has uncovered a secret they cannot keep alone',
  'needs a debt settled before it costs them everything',
  'is trying to stop something from being unleashed',
  'needs proof of a crime no one believes happened',
  'is offering a reward no one has been able to collect',
];

const COMPLICATION_TABLE = [
  'but they are not telling the whole truth.',
  'but someone else wants the same thing, for worse reasons.',
  'but the trail leads somewhere the party has history with.',
  'but time is running out faster than they let on.',
  'but helping means making a dangerous enemy.',
  'but the last person who tried this never returned.',
  'but the true cause is closer to the party than expected.',
  'but an old ally is involved on the wrong side.',
  'but the reward comes with a hidden price.',
];

function pick<T>(table: T[], rng: () => number): T {
  return table[Math.floor(rng() * table.length)];
}

/** Generate a random plot hook. `rng` defaults to Math.random but can be
 *  injected for deterministic tests — must return a value in [0, 1). */
export function generatePlotHook(rng: () => number = Math.random): PlotHook {
  return {
    subject: pick(SUBJECT_TABLE, rng),
    need: pick(NEED_TABLE, rng),
    complication: pick(COMPLICATION_TABLE, rng),
  };
}

export function formatPlotHook(hook: PlotHook): string {
  return `${hook.subject} ${hook.need} — ${hook.complication}`;
}
