import { GuideNote, GuideTopic } from '@/components/guide/GuideTopic';

export default function CampaignsGuide() {
  return (
    <GuideTopic
      slug="campaigns"
      title="Creating a Campaign"
      dek="Pick a game system, describe your module or homebrew, and upload source material."
    >
      <h2>Starting a New Campaign</h2>
      <p>
        From your Campaigns dashboard, select <strong>New Campaign</strong>. You&apos;ll be
        asked for:
      </p>
      <ul>
        <li><strong>A name</strong> for the campaign.</li>
        <li>
          <strong>A description</strong> (optional) — a short overview for your own reference.
        </li>
        <li>
          <strong>Module &amp; Campaign Info</strong> — tell the Game Master what you&apos;re
          running: a published module and its supplements, or your own homebrew setting, plus
          any house rules it should know about (for example, &quot;no multiclassing&quot; or
          &quot;using the expanded background options&quot;).
        </li>
        <li>
          <strong>A game system</strong> — choose carefully. The game system can&apos;t be
          changed once the campaign is created.
        </li>
      </ul>

      <GuideNote>
        <strong>Choose your game system carefully</strong> — it can&apos;t be changed after the
        campaign is created. If you need a different system, start a new campaign.
      </GuideNote>

      <h2>Uploading Source Material</h2>
      <p>
        Once a campaign exists, open its settings and look for the files panel. You can upload
        the actual module you&apos;re running — a PDF, plain text, or Markdown file, up to 20MB
        per file — and the Game Master will reference it directly while narrating your
        sessions, instead of relying only on general knowledge of the system. The same panel
        works for house-rule documents: upload one and it gets the same treatment as a module.
      </p>
      <p>
        Each campaign has 25MB of upload room in total. A newly uploaded file takes a short
        moment to finish being read in before the Game Master can use it — you&apos;ll see its
        status change once it&apos;s ready.
      </p>

      <h2>Turning AI Assist Off</h2>
      <p>
        If you&apos;d rather run the session yourself — at a real table, or just narrating for
        yourself — you can turn off <strong>AI Assist</strong> from campaign settings. With it
        off, the session screen becomes a plain journal you type your own notes into, with no
        AI chat at all. Your character sheet and the Oracle tools (see{' '}
        <strong>Playing a Session</strong>) stay available either way, and you can turn AI
        Assist back on at any time.
      </p>
    </GuideTopic>
  );
}
