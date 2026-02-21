'use client';

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
    <div className="voice-status">
      <style jsx>{`
        .voice-status {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          background: var(--void-raised);
          border: var(--rule-thin);
          padding: 0.375rem 0.625rem;
        }
        .status-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-heading);
          font-size: 0.625rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--ivory-muted);
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .user-list {
          padding-left: 1rem;
        }
        .user-item {
          font-family: var(--font-body);
          font-size: 0.7rem;
          color: var(--ivory-dim);
        }
      `}</style>
      <div className="status-row">
        <span className="dot" style={{ backgroundColor: config.color }} />
        {config.label}
      </div>
      {status !== 'inactive' && users.length > 0 && (
        <div className="user-list">
          {users.map((user) => (
            <div key={user} className="user-item">• {user}</div>
          ))}
        </div>
      )}
    </div>
  );
}
