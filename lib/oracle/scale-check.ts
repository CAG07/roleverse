// lib/oracle/scale-check.ts
// "Scale Check" — a graduated oracle mode for questions that don't fit
// yes/no, e.g. "What condition is this NPC in?" or "How good is this item?"
// (from the solo-RPG-community thread: agentkayne's d10 condition/quality
// check). Same pure/injectable-rng shape as builtin-oracle.ts: no I/O, no
// Anthropic call, runs entirely client-side.

export type ScaleBand = 'poor' | 'below-average' | 'average' | 'good' | 'exceptional';

export const SCALE_BAND_LABELS: Record<ScaleBand, string> = {
  poor: 'Poor',
  'below-average': 'Below Average',
  average: 'Average',
  good: 'Good',
  exceptional: 'Exceptional',
};

export interface ScaleCheckResult {
  roll: number;
  band: ScaleBand;
}

function bandForRoll(roll: number): ScaleBand {
  if (roll <= 2) return 'poor';
  if (roll <= 4) return 'below-average';
  if (roll <= 6) return 'average';
  if (roll <= 8) return 'good';
  return 'exceptional';
}

/** Roll a 1-10 Scale Check. `rng` defaults to Math.random but can be
 *  injected for deterministic tests — must return a value in [0, 1). */
export function rollScaleCheck(rng: () => number = Math.random): ScaleCheckResult {
  const roll = Math.floor(rng() * 10) + 1;
  return { roll, band: bandForRoll(roll) };
}
