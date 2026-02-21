'use client';

import { GoogleSignInButton } from './GoogleSignInButton';

export function SignInPage() {
  return (
    <main className="sign-in-root">
      <style jsx>{`
        .sign-in-root {
          display: flex;
          min-height: 100vh;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: var(--void);
        }

        .sign-in-header {
          margin-bottom: 2rem;
          text-align: center;
          animation: fadeRise 0.4s ease both;
        }

        .sign-in-title {
          font-family: var(--font-display);
          font-size: clamp(2.25rem, 6vw, 3.5rem);
          font-weight: 700;
          color: var(--ivory);
          letter-spacing: 0.05em;
          margin: 0 0 0.5rem;
          text-shadow:
            0 0 40px var(--crimson-glow),
            0 2px 4px rgba(0, 0, 0, 0.6);
        }

        .sign-in-subtitle {
          font-family: var(--font-body);
          font-size: 1.125rem;
          color: var(--ivory-muted);
          letter-spacing: 0.08em;
          margin: 0;
        }

        /* Module rule divider */
        .module-rule {
          width: 12rem;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--crimson) 30%,
            var(--gold-dim) 50%,
            var(--crimson) 70%,
            transparent 100%
          );
          margin: 0 auto 2rem;
          animation: fadeRise 0.4s ease 0.1s both;
        }

        /* Sign-in card */
        .sign-in-card {
          position: relative;
          width: 100%;
          max-width: 22rem;
          background: var(--surface-card);
          border: var(--rule-thin);
          padding: 2.5rem 2rem;
          text-align: center;
          animation: fadeRise 0.4s ease 0.2s both;
        }

        /* Crimson top accent bar */
        .sign-in-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--crimson),
            var(--gold-dim),
            var(--crimson),
            transparent
          );
        }

        /* Corner ornaments */
        .corner {
          position: absolute;
          width: 12px;
          height: 12px;
        }
        .corner.tl { top: 6px; left: 6px; border-top: 1px solid var(--gold); border-left: 1px solid var(--gold); }
        .corner.tr { top: 6px; right: 6px; border-top: 1px solid var(--gold); border-right: 1px solid var(--gold); }
        .corner.bl { bottom: 6px; left: 6px; border-bottom: 1px solid var(--gold); border-left: 1px solid var(--gold); }
        .corner.br { bottom: 6px; right: 6px; border-bottom: 1px solid var(--gold); border-right: 1px solid var(--gold); }

        .card-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--gold);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin: 0 0 0.75rem;
        }

        .card-body {
          font-family: var(--font-body);
          font-size: 0.95rem;
          color: var(--ivory-muted);
          margin: 0 0 1.75rem;
          line-height: 1.55;
        }

        .module-rule-sm {
          width: 100%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--crimson-dim),
            transparent
          );
          margin: 0 auto 2rem;
          animation: fadeRise 0.4s ease 0.3s both;
        }

        .sign-in-footer {
          margin-top: 1rem;
          text-align: center;
          font-family: var(--font-body);
          font-size: 0.75rem;
          color: var(--ivory-dim);
          animation: fadeRise 0.4s ease 0.4s both;
        }
      `}</style>

      <div className="sign-in-header">
        <h1 className="sign-in-title">RoleVerse</h1>
        <p className="sign-in-subtitle">AI-Powered Tabletop RPG Companion</p>
      </div>

      <div className="module-rule" />

      <div className="sign-in-card">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />

        <h2 className="card-title">Begin Your Quest</h2>
        <p className="card-body">
          Sign in to manage your campaigns, characters, and embark on epic adventures.
        </p>

        <GoogleSignInButton />
      </div>

      <div className="module-rule-sm" style={{ width: '16rem', marginTop: '2rem' }} />

      <footer className="sign-in-footer">
        <p>
          Supports AD&amp;D 1E/2E &bull; D&amp;D 3.5/4E/5E &bull; Pathfinder &bull; DCC &bull; The
          One Ring &bull; Cyberpunk 2020
        </p>
      </footer>
    </main>
  );
}
