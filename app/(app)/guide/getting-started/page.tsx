import { GuideTopic } from '@/components/guide/GuideTopic';

export default function GettingStartedGuide() {
  return (
    <GuideTopic
      slug="getting-started"
      title="Getting Started"
      dek="What RoleVerse is, how to sign in, and where to go first."
    >
      <h2>What RoleVerse Is</h2>
      <p>
        RoleVerse is a tabletop RPG companion built to play against — a Game Master you can
        sit down with any time, with no need to schedule a group or find a fourth player.
        You create a campaign, build a character, and play through chat: describing what
        your character does, and reading how the story responds.
      </p>
      <p>
        Currently supported game systems are Advanced Dungeons &amp; Dragons 1st and 2nd
        Edition, Dungeons &amp; Dragons 3.5, 4th, and 5th Edition (2014), Pathfinder 2nd
        Edition, Dungeon Crawl Classics, The One Ring 2nd Edition, Cyberpunk 2020, and
        Fallout 2d20.
      </p>

      <h2>Signing In</h2>
      <p>
        RoleVerse signs you in with your Google account — there&apos;s no separate password
        to create or remember. From the front page, select <strong>Sign in with Google</strong>{' '}
        and approve access when Google asks. You&apos;ll land on your Campaigns dashboard.
      </p>

      <h2>Where to Go First</h2>
      <ol>
        <li>
          Create your first campaign (see <strong>Creating a Campaign</strong>) and choose a
          game system.
        </li>
        <li>
          Add at least one character to that campaign (see <strong>Creating Characters</strong>).
        </li>
        <li>
          Start a session and say hello — the Game Master will pick up from there (see{' '}
          <strong>Playing a Session</strong>).
        </li>
      </ol>
      <p>
        Everything in RoleVerse is organized by campaign. Your characters, session history,
        NPCs, and uploaded images all live inside the campaign they belong to, and you can
        run as many separate campaigns as you like from the same account.
      </p>
    </GuideTopic>
  );
}
