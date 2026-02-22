'use client';

import styles from './VoiceStatus.module.css';

type VoiceState = 'inactive' | 'discord';

interface VoiceStatusProps {
  status?: VoiceState;
  users?: string[];
}

const statusConfig: Record<VoiceState, { label: string; color: string }> = {
  inactive: { label: 'Voice Inactive', color: '#6a6560' },
  discord: { label: 'Voice Active (Discord)', color: '#4a9a5a' },
};

export default function VoiceStatus({ status = 'inactive', users = [] }: VoiceStatusProps) {
  const config = statusConfig[status];

  return (
    <div className={styles.voiceStatus}>
      <div className={styles.statusRow}>
        <span className={styles.dot} style={{ backgroundColor: config.color }} />
        {config.label}
      </div>
      {status !== 'inactive' && users.length > 0 && (
        <div className={styles.userList}>
          {users.map((user) => (
            <div key={user} className={styles.userItem}>• {user}</div>
          ))}
        </div>
      )}
    </div>
  );
}
