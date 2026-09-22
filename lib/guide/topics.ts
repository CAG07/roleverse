// Topic index for the in-app User Guide (app/(app)/guide/**). Single source of
// truth for the landing grid and each topic page's prev/next footer nav.

export interface GuideTopic {
  slug: string;
  title: string;
  description: string;
}

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    description: 'What RoleVerse is, how to sign in, and where to go first.',
  },
  {
    slug: 'campaigns',
    title: 'Creating a Campaign',
    description: 'Pick a game system, describe your module or homebrew, and upload source material.',
  },
  {
    slug: 'characters',
    title: 'Creating Characters',
    description: 'Build a character sheet by hand, generate one, or import from Fantasy Grounds.',
  },
  {
    slug: 'playing-a-session',
    title: 'Playing a Session',
    description: 'The chat window, the Oracle, session notes, and picking up where you left off.',
  },
  {
    slug: 'npc-roster',
    title: 'The NPC Roster',
    description: 'How NPCs your party meets during play get added to your campaign roster.',
  },
  {
    slug: 'exporting-importing-characters',
    title: 'Exporting & Importing Characters',
    description: 'Print a sheet, export to Fantasy Grounds, or bring a character in from a file.',
  },
  {
    slug: 'studio',
    title: 'The Studio',
    description: 'Cover images, character portraits, and YouTube links for your campaign.',
  },
  {
    slug: 'workshop',
    title: 'The Workshop',
    description: 'A curated directory of outside tools and references, plus how to suggest your own.',
  },
];

export function getAdjacentTopics(slug: string): { prev: GuideTopic | null; next: GuideTopic | null } {
  const index = GUIDE_TOPICS.findIndex((t) => t.slug === slug);
  return {
    prev: index > 0 ? GUIDE_TOPICS[index - 1] : null,
    next: index >= 0 && index < GUIDE_TOPICS.length - 1 ? GUIDE_TOPICS[index + 1] : null,
  };
}
