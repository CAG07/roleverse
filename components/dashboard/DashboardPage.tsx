'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CampaignData } from '@/components/campaign/CampaignCard';

interface DashboardPageProps {
  campaigns: CampaignData[];
}

export function DashboardPage({ campaigns }: DashboardPageProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard-root">
      <style jsx>{`
        .dashboard-root {
          min-height: 100vh;
          background: var(--void);
          padding: 2rem 1.5rem;
        }

        /* Topbar */
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .page-title {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ivory);
          margin: 0;
        }

        .page-subtitle {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ivory-muted);
          margin: 0.25rem 0 0;
        }

        /* Search */
        .search-input {
          background: var(--void-surface);
          border: var(--rule-thin);
          color: var(--ivory);
          font-family: var(--font-body);
          font-size: 0.9rem;
          padding: 0.5rem 0.875rem;
          width: 16rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-input::placeholder {
          color: var(--ivory-dim);
        }
        .search-input:focus {
          border-color: var(--crimson);
        }

        /* New campaign button */
        .btn-new {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1.25rem;
          background: var(--crimson);
          border: 1px solid var(--crimson-bright);
          font-family: var(--font-heading);
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ivory);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-new:hover {
          background: var(--crimson-bright);
          box-shadow: 0 0 16px var(--crimson-glow);
        }

        /* Module rule / section divider */
        .section-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .section-label-text {
          font-family: var(--font-heading);
          font-size: 0.625rem;
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

        /* Campaign grid */
        .campaign-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        /* Campaign card */
        .campaign-card {
          position: relative;
          background: var(--surface-card);
          border: var(--rule-thin);
          padding: 1.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .campaign-card::before {
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
        .campaign-card:hover {
          background: var(--surface-hover);
          border-color: var(--crimson-dim);
          box-shadow: 0 0 20px var(--crimson-glow);
        }
        .campaign-card:hover::before {
          opacity: 1;
        }

        /* Corner ornaments on cards */
        .corner {
          position: absolute;
          width: 8px;
          height: 8px;
        }
        .corner.tl { top: 4px; left: 4px; border-top: 1px solid var(--gold-dim); border-left: 1px solid var(--gold-dim); }
        .corner.tr { top: 4px; right: 4px; border-top: 1px solid var(--gold-dim); border-right: 1px solid var(--gold-dim); }
        .corner.bl { bottom: 4px; left: 4px; border-bottom: 1px solid var(--gold-dim); border-left: 1px solid var(--gold-dim); }
        .corner.br { bottom: 4px; right: 4px; border-bottom: 1px solid var(--gold-dim); border-right: 1px solid var(--gold-dim); }

        .card-name {
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 600;
          color: var(--ivory);
          margin: 0 0 0.5rem;
          padding-right: 4rem;
        }

        .card-system-badge {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          font-family: var(--font-heading);
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gold);
          background: rgba(184, 136, 42, 0.1);
          border: 1px solid var(--gold-dim);
          padding: 0.2rem 0.5rem;
        }

        .card-description {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ivory-muted);
          margin: 0 0 0.75rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-date {
          font-family: var(--font-body);
          font-size: 0.75rem;
          color: var(--ivory-dim);
        }

        /* Empty state */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          border: 1px dashed var(--crimson-dim);
          text-align: center;
        }
        .empty-state-title {
          font-family: var(--font-heading);
          font-size: 1.125rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ivory);
          margin: 0 0 0.75rem;
        }
        .empty-state-body {
          font-family: var(--font-body);
          font-size: 0.9rem;
          color: var(--ivory-muted);
          max-width: 28rem;
          margin: 0 0 1.5rem;
        }
      `}</style>

      {/* Topbar */}
      <div className="topbar">
        <div>
          <h1 className="page-title">Your Campaigns</h1>
          <p className="page-subtitle">Manage your tabletop RPG adventures</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="search-input"
            type="search"
            placeholder="Search campaigns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-new" onClick={() => router.push('/campaigns/new')}>
            + New Campaign
          </button>
        </div>
      </div>

      {/* Section label */}
      <div className="section-label">
        <span className="section-label-text">Active Campaigns</span>
        <span className="section-label-line" />
      </div>

      {/* Campaign grid or empty state */}
      {filtered.length > 0 ? (
        <div className="campaign-grid">
          {filtered.map((campaign, i) => (
            <div
              key={campaign.id}
              className={`campaign-card animate-fade-rise${i === 0 ? ' delay-1' : i === 1 ? ' delay-2' : i === 2 ? ' delay-3' : ' delay-4'}`}
              onClick={() => router.push(`/campaigns/${campaign.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/campaigns/${campaign.id}`)}
            >
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              <span className="card-system-badge">{campaign.game_system.replace('-', ' ')}</span>
              <h2 className="card-name">{campaign.name}</h2>
              <p className="card-description">{campaign.description || 'No description yet.'}</p>
              <span className="card-date">
                {new Date(campaign.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-state-title">No Campaigns Yet</p>
          <p className="empty-state-body">
            Begin your first adventure by creating a new campaign. Choose your game system and
            gather your party!
          </p>
          <button className="btn-new" onClick={() => router.push('/campaigns/new')}>
            + Create Your First Campaign
          </button>
        </div>
      )}
    </div>
  );
}
