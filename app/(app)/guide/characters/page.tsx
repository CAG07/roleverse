import { GuideSection, GuideTopic } from '@/components/guide/GuideTopic';

export default function CharactersGuide() {
  return (
    <GuideTopic
      slug="characters"
      title="Creating Characters"
      dek="Build a character sheet by hand, generate one, or import from Fantasy Grounds."
    >
      <GuideSection topic="characters" id="adding-a-character" />
      <p>
        Inside a campaign, open <strong>Characters</strong> and select{' '}
        <strong>New Character</strong>. The form you see is built specifically for that
        campaign&apos;s game system — ability scores, saves, class abilities, spell slots,
        and everything else particular to that ruleset, laid out the way an official
        character sheet would.
      </p>

      <GuideSection topic="characters" id="three-ways-to-fill-it-in" />
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

      <GuideSection topic="characters" id="viewing-and-editing-a-sheet" />
      <p>
        Select any character from the Characters list to open their full sheet. From there
        you can edit any field, adjust current hit points directly on the sheet during play,
        and delete the character if you need to. Experience points work the same way — a
        plain field on the sheet, entered manually since the Game Master calls out XP awards
        in narration but doesn&apos;t save them for you. See{' '}
        <strong>Exporting &amp; Importing Characters</strong> for printing a sheet, exporting
        it to Fantasy Grounds, or bringing in updates from a file later on.
      </p>
      <p>
        Spellcasters in AD&amp;D 1st and 2nd Edition, D&amp;D 3.5, and both editions of 5th
        Edition get a <strong>Spell Book</strong> on their sheet, grouped by spell level. Add
        spells with <strong>Add Spell</strong>, then memorize them (AD&amp;D and 3.5 — use the
        plus and minus buttons, and the book shows how many of that level&apos;s slots are
        filled) or mark them prepared (5th Edition). Tick a box each time you cast: in
        AD&amp;D and 3.5 the box belongs to the memorized spell, in 5th Edition to the spell
        slot it used. <strong>Rest</strong> (or <strong>Long Rest</strong> in 5th Edition)
        restores everything you cast. The Spell Book appears once the character has spell
        slots or spells recorded; fill in spell slots on the character&apos;s edit page.
      </p>
    </GuideTopic>
  );
}
