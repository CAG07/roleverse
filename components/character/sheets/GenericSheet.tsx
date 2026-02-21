'use client';

interface GenericSheetProps {
  data: Record<string, unknown>;
  systemName: string;
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export default function GenericSheet({ data, systemName }: GenericSheetProps) {
  const entries = Object.entries(data);

  return (
    <div className="sheet-root">
      <style jsx>{`
        .sheet-root {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          overflow-y: auto;
          background: var(--surface-card);
          border: var(--rule-thin);
          padding: 0.875rem;
          font-size: 0.8125rem;
        }

        .sheet-header {
          border-bottom: 1px solid var(--crimson-dim);
          padding-bottom: 0.625rem;
        }
        .sheet-name {
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 600;
          color: var(--ivory);
          margin: 0 0 0.2rem;
        }
        .sheet-system {
          font-family: var(--font-body);
          font-size: 0.725rem;
          color: var(--ivory-dim);
          margin: 0;
        }

        .entry-row {
          display: flex;
          gap: 0.5rem;
          font-family: var(--font-body);
          font-size: 0.775rem;
          padding: 0.2rem 0;
          border-bottom: 1px solid var(--void-border);
        }
        .entry-row:last-child { border-bottom: none; }
        .entry-key {
          min-width: 5rem;
          font-family: var(--font-heading);
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ivory-muted);
        }
        .entry-val {
          white-space: pre-wrap;
          word-break: break-all;
          color: var(--ivory);
        }
      `}</style>

      <div className="sheet-header">
        <h3 className="sheet-name">{(data.name as string) ?? 'Character'}</h3>
        <p className="sheet-system">System: {systemName}</p>
      </div>

      <div>
        {entries.map(([key, value]) => (
          <div key={key} className="entry-row">
            <span className="entry-key">{key}</span>
            <span className="entry-val">{renderValue(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
