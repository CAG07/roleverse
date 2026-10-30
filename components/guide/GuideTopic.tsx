import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './GuideTopic.module.css';
import { getAdjacentTopics, getSectionTitle } from '@/lib/guide/topics';

interface GuideTopicProps {
  slug: string;
  title: string;
  dek: string;
  children: ReactNode;
}

export function GuideNote({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}

/**
 * A topic's section heading. The title comes from that section's entry in
 * lib/guide/topics.ts, which also drives the wiki sidebar's anchor links.
 */
export function GuideSection({ topic, id }: { topic: string; id: string }) {
  return (
    <h2 id={id} className={styles.sectionHeading}>
      {getSectionTitle(topic, id)}
    </h2>
  );
}

export function GuideTopic({ slug, title, dek, children }: GuideTopicProps) {
  const { prev, next } = getAdjacentTopics(slug);

  return (
    <article className={styles.root}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowText}>User Guide</span>
          <span className={styles.eyebrowLine} />
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.dek}>{dek}</p>
      </div>

      <div className={styles.prose}>{children}</div>

      {(prev || next) && (
        <nav className={styles.footerNav} aria-label="Previous and next articles">
          {prev ? (
            <Link href={`/guide/${prev.slug}`} className={styles.footerNavLink}>
              <span className={styles.footerNavDirection}>← Previous</span>
              <span className={styles.footerNavTitle}>{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/guide/${next.slug}`} className={styles.footerNavLink}>
              <span className={styles.footerNavDirection}>Next →</span>
              <span className={styles.footerNavTitle}>{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </article>
  );
}
