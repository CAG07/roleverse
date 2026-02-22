'use client';

import styles from './FGConnectionStatus.module.css';

type FGStatus = 'not_connected' | 'connected' | 'syncing';

interface FGConnectionStatusProps {
  status?: FGStatus;
}

const statusConfig: Record<FGStatus, { label: string; color: string; pulse?: boolean }> = {
  not_connected: { label: 'FG: Not Connected', color: '#6a6560' },
  connected: { label: 'FG: Connected', color: '#4a9a5a' },
  syncing: { label: 'FG: Syncing', color: '#c8873a', pulse: true },
};

export default function FGConnectionStatus({
  status = 'not_connected',
}: FGConnectionStatusProps) {
  const config = statusConfig[status];

  return (
    <div className={styles.fgStatus}>
      <span
        className={`${styles.dot}${config.pulse ? ` ${styles.pulse}` : ''}`}
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </div>
  );
}
