import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Pagination from '@/components/ui/Pagination';
import { ExtractNpcsButton } from '@/components/session/ExtractNpcsButton';
import styles from './page.module.css';

interface TranscriptEntry {
  role?: string;
  content?: string;
  agentType?: string;
  timestamp?: string;
}

interface SessionTranscriptPageRow {
  user_id: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  transcript_page: TranscriptEntry[] | null;
  transcript_total: number | null;
  page: number | null;
}

const agentLabels: Record<string, { label: string; accent: string }> = {
  narrator:          { label: 'Narrator',          accent: '#b8882a' },
  rules_arbiter:     { label: 'Rules Arbiter',      accent: '#7a8a9a' },
  npc_dialogue:      { label: 'NPC Dialogue',       accent: '#2a7a4a' },
  lore_keeper:       { label: 'Lore Keeper',        accent: '#6a3a8a' },
  encounter_builder: { label: 'Encounter Builder',  accent: '#8a6a3a' },
};

const PAGE_SIZE = 50;

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
  searchParams: Promise<{ page?: string }>;
}

export default async function SessionLogPage({ params, searchParams }: Props) {
  const { id, sessionId } = await params;
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: session } = await supabase
    .rpc('get_session_transcript_page', {
      p_session_id: sessionId,
      p_campaign_id: id,
      p_page: currentPage,
      p_page_size: PAGE_SIZE,
    })
    .maybeSingle<SessionTranscriptPageRow>();

  if (!session || session.user_id !== user.id) notFound();

  const allEntries: TranscriptEntry[] = Array.isArray(session.transcript_page)
    ? (session.transcript_page as TranscriptEntry[])
    : [];

  const totalPages = Math.max(1, Math.ceil((session.transcript_total ?? 0) / PAGE_SIZE));
  const safePage = Math.max(1, session.page ?? 1);
  const entries = allEntries;

  const isActive = !session.ended_at;
  const summary = (session.summary as string | null | undefined) ?? null;

  const startDate = new Date(session.started_at as string).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const startTime = new Date(session.started_at as string).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
  const basePath = `/campaigns/${id}/sessions/${sessionId}`;

  return (
    <div className={styles.logRoot}>
      <Link href={`/campaigns/${id}/sessions`} className={styles.logBack}>
        ← Session History
      </Link>

      <div className={styles.logHeader}>
        <h1 className={styles.logTitle}>Session Log</h1>
        <div className={styles.logMeta}>
          <span>{startDate} · {startTime}</span>
          <span>·</span>
          <span>{formatDuration(session.started_at as string, session.ended_at as string | null)}</span>
          {isActive && <span className={styles.activeBadge}>Active</span>}
        </div>
      </div>

      <div className={styles.logDivider} />

      {summary && (
        <div className={styles.summaryPanel}>
          <h2 className={styles.summaryTitle}>Session Summary</h2>
          <div className={styles.summaryBody}>{summary}</div>
        </div>
      )}

      <ExtractNpcsButton campaignId={id} sessionId={sessionId} />

      <div className={styles.logFeed}>
        {entries.length === 0 ? (
          <p className={styles.logEmpty}>
            {isActive
              ? 'No messages yet in this session.'
              : 'No messages were recorded in this session.'}
          </p>
        ) : (
          entries.map((entry, i) => {
            const time = entry.timestamp
              ? new Date(entry.timestamp).toLocaleTimeString('en-US', {
                  hour: 'numeric', minute: '2-digit',
                })
              : null;

            if (entry.role === 'player') {
              return (
                <div key={i} className={styles.entryPlayer}>
                  <span className={styles.entryPlayerName}>You</span>
                  <div className={styles.entryPlayerBubble}>{entry.content}</div>
                  {time && <span className={styles.entryTime}>{time}</span>}
                </div>
              );
            }

            if (entry.role === 'agent' && entry.content) {
              const agentKey = entry.agentType ?? 'narrator';
              const agent = agentLabels[agentKey] ?? agentLabels.narrator;
              return (
                <div key={i} className={styles.entryAgent}>
                  <span
                    className={styles.entryAgentLabel}
                    style={{ color: agent.accent, borderColor: agent.accent + '40' }}
                  >
                    {agent.label}
                  </span>
                  <div className={styles.entryAgentBubble}>{entry.content}</div>
                  {time && <span className={styles.entryTime}>{time}</span>}
                </div>
              );
            }

            return null;
          })
        )}
      </div>

      <Pagination currentPage={safePage} totalPages={totalPages} basePath={basePath} />
    </div>
  );
}
