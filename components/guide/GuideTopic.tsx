import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './GuideTopic.module.css';
import { getAdjacentTopics } from '@/lib/guide/topics';

interface GuideTopicProps {
  slug: string;
  title: string;
  dek: string;
  children: ReactNode;
}

export function GuideNote({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}

export function GuideTopic({ slug, title, dek, children }: GuideTopicProps) {
  const { prev, next } = getAdjacentTopics(slug);

  return (
    <div className={styles.root}>
      <Link href="/guide" className={styles.backLink}>
        ← Back to User Guide
      </Link>

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
        <div className={styles.footerNav}>
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
        </div>
      )}
    </div>
  );
}
