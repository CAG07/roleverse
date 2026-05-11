import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

interface TranscriptEntry {
  role?: string;
  content?: string;
  agentType?: string;
  timestamp?: string;
}

const agentLabels: Record<string, { label: string; accent: string }> = {
  narrator:          { label: 'Narrator',          accent: '#b8882a' },
  rules_arbiter:     { label: 'Rules Arbiter',      accent: '#7a8a9a' },
  npc_dialogue:      { label: 'NPC Dialogue',       accent: '#2a7a4a' },
  lore_keeper:       { label: 'Lore Keeper',        accent: '#6a3a8a' },
  encounter_builder: { label: 'Encounter Builder',  accent: '#8a6a3a' },
};

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return 'Active';
  const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

interface Props {
  params: Promise<{ id: string; sessionId: string }>;
}

export default async function SessionLogPage({ params }: Props) {
  const { id, sessionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: session } = await supabase
    .from('sessions')
    .select('id, started_at, ended_at, transcript, campaign_id, user_id')
    .eq('id', sessionId)
    .eq('campaign_id', id)
    .single();

  if (!session || session.user_id !== user.id) notFound();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name')
    .eq('id', id)
    .single();

  const entries: TranscriptEntry[] = Array.isArray(session.transcript)
    ? (session.transcript as TranscriptEntry[])
    : [];

  const isActive = !session.ended_at;

  const startDate = new Date(session.started_at as string).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = new Date(session.started_at as string).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="log-root">
      <style jsx>{`
        .log-root {
          min-height: 100vh;
          background: var(--void);
          padding: 2rem 1.5rem;
        }

        .log-back {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ivory-muted);
          text-decoration: none;
          margin-bottom: 1.5rem;
          transition: color 0.15s;
        }
        .log-back:hover { color: var(--gold); }

        .log-header { margin-bottom: 1.5rem; }

        .log-title {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ivory);
          margin: 0 0 0.25rem;
        }

        .log-meta {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ivory-muted);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .active-badge {
          font-family: var(--font-heading);
          font-size: 0.575rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #4a9a5a;
          border: 1px solid #4a9a5a;
          padding: 0.15rem 0.5rem;
        }

        .log-divider {
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--crimson), var(--gold-dim), var(--crimson), transparent);
          margin-bottom: 2rem;
        }

        .log-feed {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 52rem;
        }

        .entry-player {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }
        .entry-player-name {
          font-family: var(--font-heading);
          font-size: 0.575rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ivory-muted);
        }
        .entry-player-bubble {
          background: var(--void-raised);
          border: var(--rule-thin);
          padding: 0.625rem 0.875rem;
          font-family: var(--font-body);
          font-size: 0.9rem;
          color: var(--ivory);
          max-width: 80%;
          line-height: 1.55;
        }

        .entry-agent {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
        }
        .entry-agent-label {
          display: inline-block;
          font-family: var(--font-heading);
          font-size: 0.575rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.15rem 0.5rem;
          background: rgba(0,0,0,0.3);
          border: 1px solid;
        }
        .entry-agent-bubble {
          background: var(--surface-card);
          border-left: 2px solid var(--crimson-dim);
          padding: 0.625rem 0.875rem;
          font-family: var(--font-body);
          font-size: 0.9rem;
          color: var(--ivory);
          line-height: 1.55;
          max-width: 80%;
          white-space: pre-wrap;
        }

        .entry-time {
          font-family: var(--font-body);
          font-size: 0.65rem;
          color: var(--ivory-dim);
        }

        .log-empty {
          font-family: var(--font-body);
          font-size: 0.9rem;
          color: var(--ivory-dim);
          font-style: italic;
        }
      `}</style>

      <Link href={`/campaigns/${id}`} className="log-back">
        ← {campaign?.name ?? 'Campaign'}
      </Link>

      <div className="log-header">
        <h1 className="log-title">Session Log</h1>
        <div className="log-meta">
          <span>{startDate} · {startTime}</span>
          <span>·</span>
          <span>{formatDuration(session.started_at as string, session.ended_at as string | null)}</span>
          {isActive && <span className="active-badge">Active</span>}
        </div>
      </div>

      <div className="log-divider" />

      <div className="log-feed">
        {entries.length === 0 ? (
          <p className="log-empty">
            {isActive
              ? 'No messages yet in this session.'
              : 'No messages were recorded in this session.'}
          </p>
        ) : (
          entries.map((entry, i) => {
            const time = entry.timestamp
              ? new Date(entry.timestamp).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : null;

            if (entry.role === 'player') {
              return (
                <div key={i} className="entry-player">
                  <span className="entry-player-name">You</span>
                  <div className="entry-player-bubble">{entry.content}</div>
                  {time && <span className="entry-time">{time}</span>}
                </div>
              );
            }

            if (entry.role === 'agent' && entry.content) {
              const agentKey = entry.agentType ?? 'narrator';
              const agent = agentLabels[agentKey] ?? agentLabels.narrator;
              return (
                <div key={i} className="entry-agent">
                  <span
                    className="entry-agent-label"
                    style={{ color: agent.accent, borderColor: agent.accent + '40' }}
                  >
                    {agent.label}
                  </span>
                  <div className="entry-agent-bubble">{entry.content}</div>
                  {time && <span className="entry-time">{time}</span>}
                </div>
              );
            }

            return null;
          })
        )}
      </div>
    </div>
  );
}
