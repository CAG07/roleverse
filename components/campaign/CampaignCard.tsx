'use client';

import { useRouter } from 'next/navigation';
import { getGameSystem } from '@/lib/game-systems/registry';

export interface CampaignData {
  id: string;
  name: string;
  description: string | null;
  game_system: string;
  created_at: string;
}

function formatSystemBadge(gameSystem: string): string {
  const system = getGameSystem(gameSystem);
  if (system) return system.name;
  // Fallback: replace underscores/hyphens with spaces for display
  return gameSystem.replace(/[_-]/g, ' ');
}

export function CampaignCard({ campaign }: { campaign: CampaignData }) {
  const router = useRouter();

  const formattedDate = new Date(campaign.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className="campaign-card"
      onClick={() => router.push(`/campaigns/${campaign.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/campaigns/${campaign.id}`)}
    >
      <style jsx>{`
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
        .campaign-card:hover::before { opacity: 1; }

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

        .system-badge {
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

        .card-desc {
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
      `}</style>

      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />

      <span className="system-badge">{formatSystemBadge(campaign.game_system)}</span>
      <h2 className="card-name">{campaign.name}</h2>
      <p className="card-desc">{campaign.description || 'No description yet.'}</p>
      <span className="card-date">{formattedDate}</span>
    </div>
  );
}
