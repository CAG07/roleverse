import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getGameSystem } from '@/lib/game-systems/registry';

interface CampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (!campaign || campaign.owner_id !== user?.id) {
    notFound();
  }

  let systemName = campaign.game_system;
  let systemDescription = '';
  try {
    const system = getGameSystem(campaign.game_system);
    systemName = system.name;
    systemDescription = system.description;
  } catch {
    // Use raw slug if system is not registered
  }

  return (
    <div className="campaign-detail-root">
      <style jsx>{`
        .campaign-detail-root {
          padding: 2rem 1.5rem;
          min-height: 100vh;
          background: var(--void);
        }

        .back-link {
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
        .back-link:hover {
          color: var(--gold);
        }

        /* Campaign header */
        .campaign-header {
          margin-bottom: 2rem;
        }

        .campaign-title-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 0.5rem;
        }

        .campaign-title {
          font-family: var(--font-heading);
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--ivory);
          margin: 0;
        }

        .system-badge {
          font-family: var(--font-heading);
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold);
          background: rgba(184, 136, 42, 0.1);
          border: 1px solid var(--gold-dim);
          padding: 0.3rem 0.6rem;
          align-self: center;
        }

        .campaign-description {
          font-family: var(--font-body);
          font-size: 1rem;
          color: var(--ivory-muted);
          margin: 0 0 0.375rem;
        }

        .campaign-system-info {
          font-family: var(--font-body);
          font-size: 0.8rem;
          color: var(--ivory-dim);
        }

        /* Section label */
        .section-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .section-label-text {
          font-family: var(--font-heading);
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--gold);
          white-space: nowrap;
        }
        .section-label-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, var(--crimson-dim), transparent);
        }

        /* Action cards grid */
        .action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2.5rem;
        }

        .action-card {
          position: relative;
          background: var(--surface-card);
          border: var(--rule-thin);
          padding: 1.25rem;
          text-decoration: none;
          display: block;
          transition: all 0.2s ease;
        }
        .action-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--crimson), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .action-card:hover {
          background: var(--surface-hover);
          border-color: var(--crimson-dim);
          box-shadow: 0 0 20px var(--crimson-glow);
        }
        .action-card:hover::before {
          opacity: 1;
        }

        .action-card-title {
          font-family: var(--font-heading);
          font-size: 0.875rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ivory);
          margin: 0 0 0.5rem;
        }

        .action-card-body {
          font-family: var(--font-body);
          font-size: 0.85rem;
          color: var(--ivory-muted);
          margin: 0;
        }

        /* Start Session button — crimson primary */
        .btn-start-session {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: var(--crimson);
          border: 1px solid var(--crimson-bright);
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ivory);
          text-decoration: none;
          transition: all 0.2s;
          margin-top: 0.75rem;
        }
        .btn-start-session:hover {
          background: var(--crimson-bright);
          box-shadow: 0 0 16px var(--crimson-glow);
        }

        /* Info panels grid */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .info-panel {
          background: var(--surface-card);
          border: var(--rule-thin);
          padding: 1.25rem;
        }

        .info-panel-title {
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold);
          margin: 0 0 0.875rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--crimson-dim);
        }

        .info-panel-placeholder {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ivory-dim);
          margin: 0;
        }
      `}</style>

      <Link href="/dashboard" className="back-link">
        ← Back to Dashboard
      </Link>

      <div className="campaign-header">
        <div className="campaign-title-row">
          <h1 className="campaign-title">{campaign.name}</h1>
          <span className="system-badge">{systemName}</span>
        </div>
        {campaign.description && (
          <p className="campaign-description">{campaign.description}</p>
        )}
        {systemDescription && (
          <p className="campaign-system-info">{systemDescription}</p>
        )}
        <Link href={`/campaigns/${id}/session`} className="btn-start-session">
          ▶ Start Session
        </Link>
      </div>

      <div className="section-label">
        <span className="section-label-text">Campaign Actions</span>
        <span className="section-label-line" />
      </div>

      <div className="action-grid">
        <Link href={`/campaigns/${id}/upload`} className="action-card">
          <h3 className="action-card-title">Upload PDFs</h3>
          <p className="action-card-body">Upload rulebooks and reference materials.</p>
        </Link>

        <Link href={`/campaigns/${id}/characters`} className="action-card">
          <h3 className="action-card-title">Characters</h3>
          <p className="action-card-body">View and manage party characters.</p>
        </Link>
      </div>

      <div className="section-label">
        <span className="section-label-text">Campaign Info</span>
        <span className="section-label-line" />
      </div>

      <div className="info-grid">
        <div className="info-panel">
          <h3 className="info-panel-title">Party Members</h3>
          <p className="info-panel-placeholder">Party management coming soon.</p>
        </div>

        <div className="info-panel">
          <h3 className="info-panel-title">Session History</h3>
          <p className="info-panel-placeholder">Session logs coming soon.</p>
        </div>
      </div>
    </div>
  );
}
