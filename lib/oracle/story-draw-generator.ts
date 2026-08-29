// lib/oracle/story-draw-generator.ts
// "Story Draw" — a table-driven beginning/middle/end prompt for questions
// like "what story does this NPC tell me" (from the solo-RPG-community
// thread: agentkayne's 3-card Tarot draw). Deliberately original phrasing,
// not tarot card names/imagery — same IP-avoidance precedent as
// builtin-oracle.ts's own Flux/Likelihood naming instead of Mythic's terms.
// Same pure, side-effect-free shape: no I/O, no Anthropic call.

export interface StoryDraw {
  beginning: string;
  middle: string;
  end: string;
}

const BEGINNING_TABLE = [
  'It started with a favor asked in good faith.',
  'A chance encounter neither side expected.',
  'An old promise finally called in.',
  'Something was taken, and someone wanted it back.',
  'A stranger arrived with an offer too good to refuse.',
  'A secret came out before anyone was ready for it.',
  'Two people wanted the same thing at the same time.',
  'It began as a simple misunderstanding.',
];

const MIDDLE_TABLE = [
  'A misunderstanding made everything worse.',
  'Someone revealed they had been lying the whole time.',
  'An unexpected ally changed the balance.',
  'The cost turned out to be much higher than promised.',
  'Loyalty was tested, and not everyone passed.',
  'A third party got involved for their own reasons.',
  'The truth came out at the worst possible moment.',
  'What seemed simple turned out to be anything but.',
];

const END_TABLE = [
  'It ended, but trust was broken for good.',
  'It ended in an uneasy truce.',
  'It was left unfinished — someone got away.',
  'It ended better than anyone expected.',
  'It ended with a debt still owed.',
  'It ended quietly, but nothing was really settled.',
  'It ended in a way that made a new enemy.',
  'It ended, and everyone involved agreed never to speak of it again.',
];

function pick<T>(table: T[], rng: () => number): T {
  return table[Math.floor(rng() * table.length)];
}

/** Draw a beginning/middle/end story prompt. `rng` defaults to Math.random
 *  but can be injected for deterministic tests — must return a value in [0, 1). */
export function drawStory(rng: () => number = Math.random): StoryDraw {
  return {
    beginning: pick(BEGINNING_TABLE, rng),
    middle: pick(MIDDLE_TABLE, rng),
    end: pick(END_TABLE, rng),
  };
}

export function formatStoryDraw(draw: StoryDraw): string {
  return `${draw.beginning} ${draw.middle} ${draw.end}`;
}
