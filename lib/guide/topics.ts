// Topic index for the in-app User Guide (app/(app)/guide/**). Single source of
// truth for the wiki sidebar (articles, section anchors, search), the main page's
// article list, and each topic page's prev/next footer nav. A topic page's
// <GuideSection> headings read their titles from `sections` here, so the sidebar
// and the page can't drift apart.

export interface GuideTopicSection {
  /** Anchor id, used as the heading's `id` and the sidebar's `#hash` link. */
  id: string;
  title: string;
}

export interface GuideTopic {
  slug: string;
  title: string;
  description: string;
  sections: GuideTopicSection[];
}

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    description: 'What RoleVerse is, how to sign in, and where to go first.',
    sections: [
      { id: 'what-roleverse-is', title: 'What RoleVerse Is' },
      { id: 'signing-in', title: 'Signing In' },
      { id: 'where-to-go-first', title: 'Where to Go First' },
    ],
  },
  {
    slug: 'campaigns',
    title: 'Creating a Campaign',
    description: 'Pick a game system, describe your module or homebrew, and upload source material.',
    sections: [
      { id: 'starting-a-new-campaign', title: 'Starting a New Campaign' },
      { id: 'uploading-source-material', title: 'Uploading Source Material' },
      { id: 'scene-library', title: 'The Scene Library' },
      { id: 'turning-ai-assist-off', title: 'Turning AI Assist Off' },
    ],
  },
  {
    slug: 'characters',
    title: 'Creating Characters',
    description: 'Build a character sheet by hand, generate one, or import from Fantasy Grounds.',
    sections: [
      { id: 'adding-a-character', title: 'Adding a Character' },
      { id: 'three-ways-to-fill-it-in', title: 'Three Ways to Fill It In' },
      { id: 'viewing-and-editing-a-sheet', title: 'Viewing and Editing a Sheet' },
    ],
  },
  {
    slug: 'playing-a-session',
    title: 'Playing a Session',
    description: 'The chat window, the Oracle, session notes, and picking up where you left off.',
    sections: [
      { id: 'starting-and-resuming', title: 'Starting and Resuming' },
      { id: 'talking-to-the-game-master', title: 'Talking to the Game Master' },
      { id: 'scene-display', title: 'Scene Display' },
      { id: 'voice-input', title: 'Voice Input' },
      { id: 'the-oracle', title: 'The Oracle' },
      { id: 'session-notes', title: 'Session Notes' },
      { id: 'experience-points', title: 'Experience Points' },
      { id: 'session-history', title: 'Session History' },
    ],
  },
  {
    slug: 'npc-roster',
    title: 'The NPC Roster',
    description: 'How NPCs your party meets during play get added to your campaign roster.',
    sections: [
      { id: 'getting-flagged-during-play', title: 'Getting Flagged During Play' },
      { id: 'adding-and-editing-by-hand', title: 'Adding and Editing by Hand' },
      { id: 'why-this-matters', title: 'Why This Matters' },
    ],
  },
  {
    slug: 'exporting-importing-characters',
    title: 'Exporting & Importing Characters',
    description: 'Print a sheet, export to Fantasy Grounds, or bring a character in from a file.',
    sections: [
      { id: 'exporting-a-character', title: 'Exporting a Character' },
      { id: 'importing-into-an-existing-character', title: 'Importing Into an Existing Character' },
      { id: 'a-note-on-fantasy-grounds', title: 'A Note on Fantasy Grounds' },
    ],
  },
  {
    slug: 'studio',
    title: 'The Studio',
    description: 'Cover images, character portraits, scene photos, and YouTube videos for your campaign.',
    sections: [
      { id: 'images', title: 'Images' },
      { id: 'videos', title: 'Videos' },
    ],
  },
];

export function getTopic(slug: string): GuideTopic | undefined {
  return GUIDE_TOPICS.find((t) => t.slug === slug);
}

/** Title of one section of a topic. Throws on an unknown id so a typo fails the build. */
export function getSectionTitle(slug: string, id: string): string {
  const section = getTopic(slug)?.sections.find((s) => s.id === id);
  if (!section) throw new Error(`Unknown User Guide section "${slug}#${id}"`);
  return section.title;
}

export function getAdjacentTopics(slug: string): { prev: GuideTopic | null; next: GuideTopic | null } {
  const index = GUIDE_TOPICS.findIndex((t) => t.slug === slug);
  return {
    prev: index > 0 ? GUIDE_TOPICS[index - 1] : null,
    next: index >= 0 && index < GUIDE_TOPICS.length - 1 ? GUIDE_TOPICS[index + 1] : null,
  };
}
