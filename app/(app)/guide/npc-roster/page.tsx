import { GuideTopic } from '@/components/guide/GuideTopic';

export default function NpcRosterGuide() {
  return (
    <GuideTopic
      slug="npc-roster"
      title="The NPC Roster"
      dek="How NPCs your party meets during play get added to your campaign roster."
    >
      <h2>Getting Flagged During Play</h2>
      <p>
        When you meet or meaningfully interact with a named NPC worth remembering, a small
        card appears in the chat with two options: <strong>Add to Roster</strong> or{' '}
        <strong>Dismiss</strong>. Nothing is saved until you choose — a shopkeeper mentioned
        once in passing never has to clutter your roster if you don&apos;t want it there.
      </p>
      <p>
        Once you&apos;ve added or dismissed an NPC, you won&apos;t be asked about that same
        name again later in the same session.
      </p>

      <h2>Adding and Editing by Hand</h2>
      <p>
        You can also add, edit, or delete an NPC directly at any time, independent of
        anything happening in a session — open the campaign&apos;s NPC roster and use{' '}
        <strong>New NPC</strong>, or select an existing one to edit its details, disposition
        toward the party, and known facts.
      </p>

      <h2>Why This Matters</h2>
      <p>
        Once an NPC is on the roster, the Lore Keeper can recall them accurately later —
        their name, what you know about them, and how they feel about your party — even
        sessions later. See <strong>Playing a Session</strong> for how to ask about them.
      </p>
    </GuideTopic>
  );
}
