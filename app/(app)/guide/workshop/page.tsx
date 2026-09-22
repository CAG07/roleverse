import { GuideTopic } from '@/components/guide/GuideTopic';

export default function WorkshopGuide() {
  return (
    <GuideTopic
      slug="workshop"
      title="The Workshop"
      dek="A curated directory of outside tools and references, plus how to suggest your own."
    >
      <h2>Browsing Resources</h2>
      <p>
        The Workshop is a hand-curated directory of outside links useful to tabletop
        players — reference rules, world-building tools, virtual tabletop resources,
        publisher storefronts, map and art generators, and community spaces. Browse by
        category from the sidebar, and narrow the list further by game system using the
        filters underneath.
      </p>
      <p>
        Some listings are marked <strong>Partner</strong> or <strong>Affiliate</strong>.
        Affiliate links may earn RoleVerse a small commission if you make a purchase through
        them, at no extra cost to you — this never affects which resources are included.
      </p>

      <h2>Suggesting a Resource</h2>
      <p>
        If you&apos;ve signed in and know of something worth adding, select{' '}
        <strong>Suggest a Resource</strong> and fill in the link, category, and relevant game
        systems. Your suggestion is reviewed before it appears for everyone else, and you can
        track its status — pending, approved, or declined — under{' '}
        <strong>My Submissions</strong> on the same page.
      </p>
    </GuideTopic>
  );
}
