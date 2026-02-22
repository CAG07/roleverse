'use client';

import styles from './SignInPage.module.css';
import { GoogleSignInButton } from './GoogleSignInButton';

export function SignInPage() {
  return (
    <main className={styles.signInRoot}>
      <div className={styles.signInHeader}>
        <h1 className={styles.signInTitle}>RoleVerse</h1>
        <p className={styles.signInSubtitle}>AI-Powered Tabletop RPG Companion</p>
      </div>

      <div className={styles.moduleRule} />

      <div className={styles.signInCard}>
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        <h2 className={styles.cardTitle}>Begin Your Quest</h2>
        <p className={styles.cardBody}>
          Sign in to manage your campaigns, characters, and embark on epic adventures.
        </p>

        <GoogleSignInButton />
      </div>

      <div className={styles.moduleRuleSm} style={{ width: '16rem', marginTop: '2rem' }} />

      <footer className={styles.signInFooter}>
        <p>
          Supports AD&amp;D 1E/2E &bull; D&amp;D 3.5/4E/5E &bull; Pathfinder &bull; DCC &bull; The
          One Ring &bull; Cyberpunk 2020
        </p>
      </footer>
    </main>
  );
}
