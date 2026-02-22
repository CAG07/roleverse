'use client';

import styles from './PartyStatus.module.css';

interface PartyMember {
  id: string;
  characterName: string;
  characterClass: string;
  currentHp: number;
  maxHp: number;
  status: 'active' | 'unconscious' | 'dead';
}

interface PartyStatusProps {
  members: PartyMember[];
}

const statusDotColor: Record<PartyMember['status'], string> = {
  active: '#4a9a5a',
  unconscious: '#c8873a',
  dead: '#b02020',
};

export default function PartyStatus({ members }: PartyStatusProps) {
  return (
    <div className={styles.partyStatus}>
      <div className={styles.sectionLabel}>Party Status</div>
      <div className={styles.memberList}>
        {members.length === 0 ? (
          <p className={styles.empty}>No party members yet.</p>
        ) : (
          members.map((m) => (
            <div key={m.id} className={styles.memberRow}>
              <span
                className={styles.statusDot}
                style={{ backgroundColor: statusDotColor[m.status] }}
              />
              <span className={styles.memberName}>{m.characterName}</span>
              <span className={styles.memberClass}>{m.characterClass}</span>
              <span className={styles.memberHp}>{m.currentHp}/{m.maxHp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
