'use client';

import styles from './page.module.css';
import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <main className={styles.errorRoot}>
      <div className={styles.errorCard}>
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        <h1 className={styles.errorTitle}>Authentication Failed</h1>
        <p className={styles.errorBody}>Something went wrong during sign in. Please try again.</p>
        <Link href="/" className={styles.btnReturn}>
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
