import { GuideSection, GuideTopic } from '@/components/guide/GuideTopic';

export default function StudioGuide() {
  return (
    <GuideTopic
      slug="studio"
      title="The Studio"
      dek="Cover images, character portraits, and YouTube links for your campaign."
    >
      <GuideSection topic="studio" id="images" />
      <p>
        The Studio gathers every image tied to a campaign in one place — your campaign&apos;s
        cover image, each character&apos;s avatar, and anything you&apos;ve uploaded to the
        Scene Library, all shown as a gallery you can click through full-size. There&apos;s
        nothing to upload directly from the Studio itself: set a cover image from campaign
        settings, give a character an avatar from their sheet, or add a scene image, and it
        appears here automatically.
      </p>

      <GuideSection topic="studio" id="videos" />
      <p>
        RoleVerse doesn&apos;t host video files. Instead, the Studio shows YouTube videos as
        playable embeds, gathered from two places:
      </p>
      <ul>
        <li>
          <strong>Videos you add by hand</strong> — paste a YouTube link into the Scene
          Library on the campaign page, or into the <strong>Attach Scene</strong> window
          during a session. These show the title you gave them, or &quot;Added to the Scene
          Library&quot; if you left the title blank.
        </li>
        <li>
          <strong>Links found in your documents</strong> — any YouTube link inside a module,
          house rules, or notes you&apos;ve uploaded is picked up automatically and shown
          with that document&apos;s title.
        </li>
      </ul>
      <p>
        Either way, it&apos;s a way to attach ambient music, battle maps in video form, or
        other reference clips without using any of your campaign&apos;s storage space.
      </p>
    </GuideTopic>
  );
}
