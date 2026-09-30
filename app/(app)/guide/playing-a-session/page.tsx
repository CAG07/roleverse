import { GuideNote, GuideTopic } from '@/components/guide/GuideTopic';

export default function PlayingASessionGuide() {
  return (
    <GuideTopic
      slug="playing-a-session"
      title="Playing a Session"
      dek="The chat window, the Oracle, session notes, and picking up where you left off."
    >
      <h2>Starting and Resuming</h2>
      <p>
        From a campaign&apos;s page, select <strong>Start Session</strong>. If a session is
        already in progress, the same button reads <strong>Resume Session</strong> — sessions
        stay open until you end them from campaign settings, so you can always come back to
        exactly where you were, including with a fresh recap of what happened last time.
      </p>

      <h2>Talking to the Game Master</h2>
      <p>
        The chat window is where you play. Describe what your character says or does, in
        plain language, and you&apos;ll see a reply appear underneath. Replies are labeled by
        who&apos;s answering:
      </p>
      <ul>
        <li>
          <strong>Game Master</strong> — narrates the scene, plays every NPC, and runs
          combat. This is who you&apos;re talking to most of the time.
        </li>
        <li>
          <strong>Rules Arbiter</strong> — answers rules questions directly from the
          rulebook. Ask something like &quot;how does grappling work?&quot; and it&apos;ll
          answer as a rules question rather than as part of the story.
        </li>
        <li>
          <strong>Lore Keeper</strong> — answers questions about what&apos;s already
          happened. Ask &quot;who was that innkeeper again?&quot; or &quot;what did we learn
          about the missing caravan?&quot; and it&apos;ll recall it from earlier in the
          campaign.
        </li>
      </ul>
      <p>
        You don&apos;t need to address any of the three by name — just ask or act naturally,
        and your message goes to whichever one fits.
      </p>

      <h2>Voice Input</h2>
      <p>
        The small microphone indicator near the chat is a permission toggle, not a
        transcription feature — RoleVerse never records or sends your voice anywhere. Turn it
        on to confirm your browser has microphone access, then use your own device&apos;s
        built-in dictation (the microphone key on a phone keyboard, or your operating
        system&apos;s voice-typing shortcut) to speak your message straight into the chat box.
      </p>

      <h2>The Oracle</h2>
      <p>
        The Oracle panel is a set of solo-play tools you can reach for any time you want an
        outside answer instead of deciding something yourself:
      </p>
      <ul>
        <li>
          <strong>Quick Ask</strong> — pose a yes/no question, set how likely you think the
          answer is, and get an answer (sometimes with an unexpected twist).
        </li>
        <li>
          <strong>Scale Check</strong> — roll a graded outcome instead of a plain yes/no.
        </li>
        <li>
          <strong>Saved questions</strong> — save a question you ask often so you can reuse it
          with one click.
        </li>
        <li>
          <strong>Generators</strong> — plot hooks, story elements, names, and quick NPCs, for
          whenever you need inspiration on the spot.
        </li>
      </ul>
      <p>Every Oracle result is logged to your session automatically.</p>

      <h2>Session Notes</h2>
      <p>
        The Session Notes box is your own private scratchpad for the session — jot down
        anything you want to remember.
      </p>
      <GuideNote>
        Session Notes are saved to this browser only, not to your account. They won&apos;t
        follow you to a different device, and clearing your browser data will clear them too.
      </GuideNote>

      <h2>Experience Points</h2>
      <p>
        The Game Master calls out experience point awards in narration — after a fight, when
        treasure is recovered, or when a session wraps up — but doesn&apos;t save them
        anywhere itself. Jot the numbers down when the Game Master states them, and enter
        them yourself in the <strong>Experience Points</strong> field on your character sheet
        before your next session.
      </p>
      <GuideNote>
        There&apos;s no persistent memory between sessions, so recorded XP totals live only on
        your character sheet, not in the chat history.
      </GuideNote>

      <h2>Session History</h2>
      <p>
        Select <strong>Session History</strong> from the session sidebar to browse every past
        session in the campaign, with an automatic summary and how long each one ran. You can
        browse this list even while a session is actively in progress.
      </p>
    </GuideTopic>
  );
}
