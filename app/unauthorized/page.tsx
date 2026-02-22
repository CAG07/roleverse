'use client';

import styles from './page.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <main className={styles.errorRoot}>
      <div className={styles.errorCard}>
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        <h1 className={styles.errorTitle}>Access Restricted</h1>
        <p className={styles.errorBody}>
          This application is currently in private beta. Contact the administrator for access.
        </p>

        <button onClick={handleSignOut} className={styles.btnAction} type="button">
          Sign Out
        </button>
        <Link href="/" className={styles.returnLink}>
          Back to Home
        </Link>
      </div>
    </main>
  );
}
