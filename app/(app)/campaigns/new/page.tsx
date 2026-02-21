'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getAllGameSystems } from '@/lib/game-systems/registry';

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gameSystem, setGameSystem] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const systems = getAllGameSystems();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Campaign name is required.');
      return;
    }
    if (!gameSystem) {
      setError('Please select a game system.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be signed in to create a campaign.');
        return;
      }

      const { data, error: insertError } = await supabase
        .from('campaigns')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          game_system: gameSystem,
          owner_id: user.id,
        })
        .select('id')
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.push(`/campaigns/${data.id}`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-campaign-root">
      <style jsx>{`
        .new-campaign-root {
          padding: 2rem 1.5rem;
          min-height: 100vh;
          background: var(--void);
        }

        .page-title {
          font-family: var(--font-heading);
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ivory);
          margin: 0 0 2rem;
        }

        .form-card {
          position: relative;
          max-width: 36rem;
          background: var(--surface-card);
          border: var(--rule-thin);
          padding: 2rem;
        }
        .form-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--crimson), var(--gold-dim), var(--crimson), transparent);
        }

        .form-card-title {
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--gold);
          margin: 0 0 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--crimson-dim);
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-label {
          display: block;
          font-family: var(--font-heading);
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--ivory-muted);
          margin-bottom: 0.4rem;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          background: var(--void-surface);
          border: var(--rule-thin);
          color: var(--ivory);
          font-family: var(--font-body);
          font-size: 0.95rem;
          padding: 0.625rem 0.875rem;
          outline: none;
          transition: border-color 0.2s;
          resize: vertical;
        }
        .form-input::placeholder,
        .form-textarea::placeholder {
          color: var(--ivory-dim);
        }
        .form-input:focus,
        .form-textarea:focus {
          border-color: var(--crimson);
        }

        /* System selector — card grid */
        .system-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.625rem;
          margin-top: 0.25rem;
        }

        .system-option {
          position: relative;
          background: var(--void-surface);
          border: var(--rule-thin);
          padding: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .system-option:hover {
          border-color: var(--crimson-dim);
          background: var(--void-raised);
        }
        .system-option.selected {
          border-color: var(--crimson);
          background: var(--void-raised);
          box-shadow: 0 0 12px var(--crimson-glow);
        }
        .system-option.selected::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--crimson), transparent);
        }
        /* Corner ornaments on selected */
        .system-option.selected .corner {
          display: block;
        }
        .corner {
          position: absolute;
          width: 8px;
          height: 8px;
          display: none;
        }
        .corner.tl { top: 4px; left: 4px; border-top: 1px solid var(--gold); border-left: 1px solid var(--gold); }
        .corner.tr { top: 4px; right: 4px; border-top: 1px solid var(--gold); border-right: 1px solid var(--gold); }
        .corner.bl { bottom: 4px; left: 4px; border-bottom: 1px solid var(--gold); border-left: 1px solid var(--gold); }
        .corner.br { bottom: 4px; right: 4px; border-bottom: 1px solid var(--gold); border-right: 1px solid var(--gold); }

        .system-name {
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--ivory);
          margin: 0 0 0.25rem;
        }

        .system-description {
          font-family: var(--font-body);
          font-size: 0.75rem;
          color: var(--ivory-dim);
          margin: 0;
        }

        .error-msg {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--crimson-bright);
          margin-bottom: 1rem;
        }

        .btn-submit {
          width: 100%;
          padding: 0.75rem 1.5rem;
          background: var(--crimson);
          border: 1px solid var(--crimson-bright);
          font-family: var(--font-heading);
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ivory);
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-submit:hover:not(:disabled) {
          background: var(--crimson-bright);
          box-shadow: 0 0 16px var(--crimson-glow);
        }
        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <h1 className="page-title">Create New Campaign</h1>

      <div className="form-card">
        <p className="form-card-title">Campaign Details</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Campaign Name *</label>
            <input
              id="name"
              className="form-input"
              placeholder="e.g., The Lost Mines of Phandelver"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              className="form-textarea"
              placeholder="A brief overview of your campaign..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Game System *</label>
            <div className="system-grid">
              {systems.map((system) => (
                <button
                  key={system.id}
                  type="button"
                  className={`system-option${gameSystem === system.id ? ' selected' : ''}`}
                  onClick={() => setGameSystem(system.id)}
                >
                  <span className="corner tl" />
                  <span className="corner tr" />
                  <span className="corner bl" />
                  <span className="corner br" />
                  <p className="system-name">{system.name}</p>
                  <p className="system-description">{system.description}</p>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? 'Creating…' : 'Create Campaign'}
          </button>
        </form>
      </div>
    </div>
  );
}
