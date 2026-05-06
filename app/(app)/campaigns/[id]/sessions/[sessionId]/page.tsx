import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

interface SessionDetailPageProps {
  params: Promise<{ id: string; sessionId: string }>;
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return 'Active';
  const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { id, sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('id, started_at, ended_at, transcript, campaign_id, user_id')
    .eq('id', sessionId)
    .eq('campaign_id', id)
    .single();

  if (!session || session.user_id !== user.id) {
    notFound();
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name')
    .eq('id', id)
    .single();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link
        href={`/campaigns/${id}`}
        style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: '0.875rem' }}
      >
        ← Back to {campaign?.name ?? 'Campaign'}
      </Link>

      <h1 style={{ marginTop: '1.5rem', marginBottom: '0.25rem' }}>
        Session —{' '}
        {new Date(session.started_at).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </h1>

      <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Duration: {formatDuration(session.started_at, session.ended_at)}
        {!session.ended_at && (
          <span style={{ marginLeft: '0.5rem', color: 'var(--color-accent)' }}>● Active</span>
        )}
      </p>

      <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Transcript</h2>
      {session.transcript ? (
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.5rem',
            padding: '1rem',
            fontSize: '0.875rem',
            lineHeight: 1.6,
          }}
        >
          {session.transcript}
        </pre>
      ) : (
        <p style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>
          No transcript available for this session.
        </p>
      )}
    </div>
  );
}
