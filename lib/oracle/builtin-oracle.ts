// lib/oracle/builtin-oracle.ts
// "The Flux Oracle" — RoleVerse's built-in, zero-setup solo-play oracle.
// Deliberately original: a formula-based percentile system, not a lookup
// table, with its own terminology (Likelihood/Flux/Twist) rather than
// Mythic Game Master Emulator's copyrighted Fate Chart/Chaos Factor/
// Exceptional-result naming and values. Players who want genuine Mythic
// fidelity bring their own copy via the "My Oracle" upload path
// (lib/oracle/consult-oracle.ts) instead — this module exists so every
// player has an instant, free, no-setup option even without one.
//
// Pure and side-effect-free by design: no I/O, no Anthropic call, runs
// entirely client-side. `rng` is injectable for deterministic testing.

export type Likelihood = 'impossible' | 'unlikely' | 'fifty-fifty' | 'likely' | 'certain';

export const LIKELIHOOD_LABELS: Record<Likelihood, string> = {
  impossible: 'Impossible',
  unlikely: 'Unlikely',
  'fifty-fifty': '50/50',
  likely: 'Likely',
  certain: 'Certain',
};

const LIKELIHOOD_BASE_TARGET: Record<Likelihood, number> = {
  impossible: 10,
  unlikely: 30,
  'fifty-fifty': 50,
  likely: 70,
  certain: 90,
};

export type OracleAnswer = 'strong-yes' | 'yes' | 'no' | 'strong-no';

export const ANSWER_LABELS: Record<OracleAnswer, string> = {
  'strong-yes': 'Strong Yes',
  yes: 'Yes',
  no: 'No',
  'strong-no': 'Strong No',
};

export interface OracleResult {
  likelihood: Likelihood;
  flux: number;
  roll: number;
  target: number;
  answer: OracleAnswer;
  twist: boolean;
  twistRoll: number;
}

export const MIN_FLUX = 1;
export const MAX_FLUX = 9;
export const NEUTRAL_FLUX = 5;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Flux above neutral nudges every answer toward yes; below neutral, toward no. */
export function adjustedTarget(likelihood: Likelihood, flux: number): number {
  const base = LIKELIHOOD_BASE_TARGET[likelihood];
  return clamp(base + (flux - NEUTRAL_FLUX) * 4, 5, 95);
}

function rollD(sides: number, rng: () => number): number {
  return Math.floor(rng() * sides) + 1;
}

/**
 * Consult the Flux Oracle. `rng` defaults to Math.random but can be injected
 * for deterministic tests — must return a value in [0, 1).
 */
export function consultOracle(likelihood: Likelihood, flux: number, rng: () => number = Math.random): OracleResult {
  const clampedFlux = clamp(flux, MIN_FLUX, MAX_FLUX);
  const target = adjustedTarget(likelihood, clampedFlux);
  const roll = rollD(100, rng);

  let answer: OracleAnswer;
  if (roll <= target * 0.15) answer = 'strong-yes';
  else if (roll <= target) answer = 'yes';
  else if (roll <= target + (100 - target) * 0.85) answer = 'no';
  else answer = 'strong-no';

  const twistRoll = rollD(20, rng);
  const twist = twistRoll <= clampedFlux;

  return { likelihood, flux: clampedFlux, roll, target, answer, twist, twistRoll };
}
