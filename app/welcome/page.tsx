'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

export default function WelcomePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    setSubmitting(true);
    setError('');
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Your session has expired. Please sign in again.');
      setSubmitting(false);
      return;
    }
    // upsert (not insert) — self-healing for a user with no existing
    // profiles row, since nothing has ever written to this table before.
    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      tos_accepted_at: new Date().toISOString(),
    });
    if (upsertError) {
      setError('Something went wrong saving your acceptance. Please try again.');
      setSubmitting(false);
      return;
    }
    router.push('/dashboard');
  };

  return (
    <main className={styles.welcomeRoot}>
      <div className={styles.welcomeCard}>
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        <h1 className={styles.welcomeTitle}>Welcome to RoleVerse</h1>
        <p className={styles.welcomeBody}>
          RoleVerse is a solo-play tabletop RPG companion supporting D&amp;D 5th Edition, AD&amp;D
          1st and 2nd Edition, Pathfinder 2E, and Dungeon Crawl Classics. Three specialized AI
          agents — a Game Master, a Rules Arbiter, and a Lore Keeper — work together to run your
          campaign, grounded in official rules content and the modules you upload. If you&apos;d
          rather play without any AI assistance at all, every campaign can also be switched to a
          zero-AI Oracle and Journal mode. This application is currently in private beta.
        </p>

        <div className={styles.tosBox}>
          {/* TODO(legal): Placeholder Terms of Service text — needs real legal
              review before real beta users see this. Do not treat as final copy. */}
          <h2 className={styles.tosHeading}>Terms of Service (Draft)</h2>
          <p className={styles.tosText}>
            RoleVerse is an AI-assisted tabletop RPG tool currently in private beta testing. By
            using this application, you acknowledge that it is provided as-is during an active
            testing period, that generated content is produced by a large language model and may
            contain errors or inconsistencies, and that features and behavior may change without
            notice while in beta. This placeholder text will be replaced with reviewed Terms of
            Service before a wider release.
          </p>
        </div>

        {error && <p className={styles.welcomeError}>{error}</p>}

        <button
          type="button"
          className={styles.btnAction}
          onClick={() => void handleAccept()}
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'I Accept — Continue to Dashboard'}
        </button>
      </div>
    </main>
  );
}
