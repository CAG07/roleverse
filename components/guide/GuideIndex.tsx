import Link from 'next/link';
import styles from './GuideIndex.module.css';
import { GUIDE_TOPICS } from '@/lib/guide/topics';

export function GuideIndex() {
  return (
    <article className={styles.root}>
      <div className={styles.eyebrow}>
        <span className={styles.eyebrowText}>User Guide</span>
        <span className={styles.eyebrowLine} />
      </div>
      <h1 className={styles.title}>Main Page</h1>
      <p className={styles.intro}>
        Everything you need to run your first campaign in RoleVerse — no technical knowledge
        required. Read the articles in order if this is your first visit, or use the contents
        and search on the left to jump straight to what you need.
      </p>

      <h2 className={styles.sectionHeading}>Articles</h2>
      <ol className={styles.articleList}>
        {GUIDE_TOPICS.map((topic) => (
          <li key={topic.slug} className={styles.articleItem}>
            <Link href={`/guide/${topic.slug}`} className={styles.articleLink}>
              {topic.title}
            </Link>
            <span className={styles.articleDescription}>{topic.description}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}
