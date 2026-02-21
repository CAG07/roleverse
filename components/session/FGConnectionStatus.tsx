'use client';

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
    <div className="fg-status">
      <style jsx>{`
        .fg-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--void-raised);
          border: var(--rule-thin);
          padding: 0.375rem 0.625rem;
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
        .dot.pulse {
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
      `}</style>
      <span
        className={`dot${config.pulse ? ' pulse' : ''}`}
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </div>
  );
}
