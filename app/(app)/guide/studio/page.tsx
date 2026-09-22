import { GuideTopic } from '@/components/guide/GuideTopic';

export default function StudioGuide() {
  return (
    <GuideTopic
      slug="studio"
      title="The Studio"
      dek="Cover images, character portraits, and YouTube links for your campaign."
    >
      <h2>Images</h2>
      <p>
        The Studio gathers every image tied to a campaign in one place — your campaign&apos;s
        cover image, each character&apos;s avatar, and anything you&apos;ve uploaded to the
        Scene Library, all shown as a gallery you can click through full-size. There&apos;s
        nothing to upload directly from the Studio itself: set a cover image from campaign
        settings, give a character an avatar from their sheet, or add a scene image, and it
        appears here automatically.
      </p>

      <h2>Videos</h2>
      <p>
        RoleVerse doesn&apos;t host video directly. Instead, if a YouTube link appears in a
        document you&apos;ve uploaded to the campaign (a module, house rules, or your own
        notes), it&apos;s picked up and shown here as a playable embed — a way to attach
        handout music, battle maps in video form, or other reference clips without RoleVerse
        needing to store the video itself.
      </p>
    </GuideTopic>
  );
}
