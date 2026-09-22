import Link from 'next/link';
import styles from './GuideIndex.module.css';
import { GUIDE_TOPICS } from '@/lib/guide/topics';

export function GuideIndex() {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.title}>User Guide</h1>
        <p className={styles.subtitle}>
          Everything you need to run your first campaign in RoleVerse — no technical
          knowledge required. Work through the topics in order if this is your first
          visit, or jump straight to what you need.
        </p>
      </div>

      <div className={styles.sectionLabel}>
        <span className={styles.sectionLabelText}>Topics</span>
        <span className={styles.sectionLabelLine} />
      </div>

      <div className={styles.topicGrid}>
        {GUIDE_TOPICS.map((topic, i) => (
          <Link key={topic.slug} href={`/guide/${topic.slug}`} className={styles.topicCard}>
            <span className={styles.topicNumber}>{String(i + 1).padStart(2, '0')}</span>
            <span className={styles.topicTitle}>{topic.title}</span>
            <span className={styles.topicDescription}>{topic.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
