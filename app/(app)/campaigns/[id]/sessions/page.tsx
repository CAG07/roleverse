import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import styles from './page.module.css';

const SUMMARY_PREVIEW_LENGTH = 150;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return 'Active';
  const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionsListPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, owner_id')
    .eq('id', id)
    .single();

  if (!campaign || campaign.owner_id !== user.id) notFound();

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, started_at, ended_at, summary')
    .eq('campaign_id', id)
    .eq('user_id', user.id)
    .order('started_at', { ascending: false });

  const rows = sessions ?? [];

  return (
    <div className={styles.root}>
      <Link href={`/campaigns/${id}`} className={styles.backLink}>
        ← {campaign.name as string}
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>Session History</h1>
        <span className={styles.count}>{rows.length} session{rows.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={styles.divider} />

      {rows.length === 0 ? (
        <p className={styles.empty}>No sessions yet. Start a session from the campaign page.</p>
      ) : (
        <div className={styles.sessionList}>
          {rows.map((session) => {
            const isActive = !session.ended_at;
            const href = isActive
              ? `/campaigns/${id}/session`
              : `/campaigns/${id}/sessions/${session.id}`;
            const summary = (session.summary as string | null | undefined) ?? null;
            const preview = summary
              ? summary.length > SUMMARY_PREVIEW_LENGTH
                ? summary.slice(0, SUMMARY_PREVIEW_LENGTH).trimEnd() + '…'
                : summary
              : null;

            return (
              <Link key={session.id} href={href} className={styles.sessionRow}>
                <div className={styles.sessionMeta}>
                  <span
                    className={styles.statusDot}
                    style={{ backgroundColor: isActive ? 'var(--status-healthy)' : 'var(--ivory-dim)' }}
                  />
                  <span className={styles.sessionDate}>
                    {formatDate(session.started_at as string)} · {formatTime(session.started_at as string)}
                  </span>
                  <span className={styles.sessionDuration}>
                    {formatDuration(session.started_at as string, session.ended_at as string | null)}
                  </span>
                  {isActive && <span className={styles.activeBadge}>Active</span>}
                </div>
                {preview && (
                  <p className={styles.sessionPreview}>{preview}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
