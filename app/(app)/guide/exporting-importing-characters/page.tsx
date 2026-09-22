import { GuideNote, GuideTopic } from '@/components/guide/GuideTopic';

export default function ExportingImportingCharactersGuide() {
  return (
    <GuideTopic
      slug="exporting-importing-characters"
      title="Exporting & Importing Characters"
      dek="Print a sheet, export to Fantasy Grounds, or bring a character in from a file."
    >
      <h2>Exporting a Character</h2>
      <p>
        On any character&apos;s sheet page, you&apos;ll find:
      </p>
      <ul>
        <li>
          <strong>Print / Save as PDF</strong> — opens your browser&apos;s print dialog with a
          clean, ink-friendly layout of the sheet.
        </li>
        <li>
          <strong>Export as Text</strong> — downloads a plain text file of the full sheet.
        </li>
        <li>
          <strong>Export to Fantasy Grounds</strong> — downloads an XML file formatted for
          Fantasy Grounds, ready to import there.
        </li>
      </ul>

      <h2>Importing Into an Existing Character</h2>
      <p>
        The same sheet page also offers <strong>Import from Fantasy Grounds</strong> and{' '}
        <strong>Import as Text</strong>, so you can bring updates into a character you already
        created — useful if you&apos;ve been keeping a character&apos;s sheet up to date
        somewhere else and want RoleVerse to match it.
      </p>
      <p>
        Choosing a file never overwrites anything immediately. You&apos;ll first see a review
        screen comparing every field the file would change against what&apos;s currently on
        the character, with nothing applied until you confirm. Anything the importer
        couldn&apos;t confidently read from the file is called out separately so you can fill
        it in by hand.
      </p>
      <GuideNote>
        Fantasy Grounds&apos; file format isn&apos;t officially published, so importing from it
        is best-effort — well-tested for the fields most character sheets actually use, but
        always double-check the review screen before confirming.
      </GuideNote>

      <h2>A Note on Fantasy Grounds</h2>
      <p>
        RoleVerse doesn&apos;t connect live to Fantasy Grounds — there&apos;s no ongoing sync.
        Exporting and importing both work through a plain file you download and upload
        yourself, whenever you want to move a character between the two.
      </p>
    </GuideTopic>
  );
}
