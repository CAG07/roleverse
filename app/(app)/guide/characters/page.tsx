import { GuideTopic } from '@/components/guide/GuideTopic';

export default function CharactersGuide() {
  return (
    <GuideTopic
      slug="characters"
      title="Creating Characters"
      dek="Build a character sheet by hand, generate one, or import from Fantasy Grounds."
    >
      <h2>Adding a Character</h2>
      <p>
        Inside a campaign, open <strong>Characters</strong> and select{' '}
        <strong>New Character</strong>. The form you see is built specifically for that
        campaign&apos;s game system — ability scores, saves, class abilities, spell slots,
        and everything else particular to that ruleset, laid out the way an official
        character sheet would.
      </p>

      <h2>Three Ways to Fill It In</h2>
      <ul>
        <li>
          <strong>Fill it in by hand.</strong> Name, race, class, level, and every
          system-specific field are plain form inputs.
        </li>
        <li>
          <strong>Generate a premade character.</strong> Give an optional one-line hint (for
          example, &quot;a grizzled dwarven fighter&quot;) and select{' '}
          <strong>Generate Premade Character</strong>. The form fills itself in with a
          complete, ready-to-play character you can then adjust however you like.
        </li>
        <li>
          <strong>Import from Fantasy Grounds.</strong> If you already have a character
          exported from Fantasy Grounds as an XML file, choose it and the form fills itself
          in from that file. Today this works for AD&amp;D 1st and 2nd Edition campaigns;
          for other systems, use the generator or fill in the form by hand instead.
        </li>
      </ul>

      <h2>Viewing and Editing a Sheet</h2>
      <p>
        Select any character from the Characters list to open their full sheet. From there
        you can edit any field, adjust current hit points directly on the sheet during play,
        and delete the character if you need to. Experience points work the same way — a
        plain field on the sheet, entered manually since the Game Master calls out XP awards
        in narration but doesn&apos;t save them for you. See{' '}
        <strong>Exporting &amp; Importing Characters</strong> for printing a sheet, exporting
        it to Fantasy Grounds, or bringing in updates from a file later on.
      </p>
    </GuideTopic>
  );
}
