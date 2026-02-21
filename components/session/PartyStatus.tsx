'use client';

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
    <div className="party-status">
      <style jsx>{`
        .party-status {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .section-label {
          font-family: var(--font-heading);
          font-size: 0.575rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--gold);
        }
        .member-list {
          background: var(--surface-card);
          border: var(--rule-thin);
          padding: 0.5rem;
        }
        .member-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.3rem 0;
          border-bottom: 1px solid var(--void-border);
          font-family: var(--font-body);
          font-size: 0.775rem;
        }
        .member-row:last-child { border-bottom: none; }
        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .member-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--ivory);
          font-weight: 500;
        }
        .member-class {
          color: var(--ivory-muted);
          font-size: 0.725rem;
        }
        .member-hp {
          font-family: var(--font-heading);
          font-size: 0.7rem;
          color: var(--ivory-dim);
          white-space: nowrap;
        }
        .empty {
          font-family: var(--font-body);
          font-size: 0.775rem;
          color: var(--ivory-dim);
        }
      `}</style>

      <div className="section-label">Party Status</div>
      <div className="member-list">
        {members.length === 0 ? (
          <p className="empty">No party members yet.</p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="member-row">
              <span
                className="status-dot"
                style={{ backgroundColor: statusDotColor[m.status] }}
              />
              <span className="member-name">{m.characterName}</span>
              <span className="member-class">{m.characterClass}</span>
              <span className="member-hp">{m.currentHp}/{m.maxHp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
