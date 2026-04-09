'use client';

import { useRouter } from 'next/navigation';
import styles from './DashboardOnboarding.module.css';

interface DashboardOnboardingProps {
  userName?: string;
}

export function DashboardOnboarding({ userName }: DashboardOnboardingProps) {
  const router = useRouter();

  return (
    <div className={styles.onboardingRoot}>
      <div className={styles.onboardingCard}>
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        <p className={styles.welcomeLabel}>
          {userName ? `Welcome, ${userName}!` : 'Welcome To'}
        </p>
        <h1 className={styles.welcomeTitle}>RoleVerse</h1>

        <div className={styles.moduleRule} />

        <p className={styles.welcomeBody}>
          Your AI-powered tabletop companion. Create your first campaign to begin.
        </p>

        <button
          className={styles.btnCreate}
          onClick={() => router.push('/campaigns/new')}
          type="button"
        >
          + Create Campaign
        </button>
      </div>
    </div>
  );
}
