'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <main className="error-root">
      <style jsx>{`
        .error-root {
          display: flex;
          min-height: 100vh;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: var(--void);
        }

        .error-card {
          position: relative;
          width: 100%;
          max-width: 22rem;
          background: var(--surface-card);
          border: var(--rule-thin);
          padding: 2.5rem 2rem;
          text-align: center;
          animation: fadeRise 0.4s ease both;
        }
        .error-card::before {
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

        .corner {
          position: absolute;
          width: 12px;
          height: 12px;
        }
        .corner.tl { top: 6px; left: 6px; border-top: 1px solid var(--gold); border-left: 1px solid var(--gold); }
        .corner.tr { top: 6px; right: 6px; border-top: 1px solid var(--gold); border-right: 1px solid var(--gold); }
        .corner.bl { bottom: 6px; left: 6px; border-bottom: 1px solid var(--gold); border-left: 1px solid var(--gold); }
        .corner.br { bottom: 6px; right: 6px; border-bottom: 1px solid var(--gold); border-right: 1px solid var(--gold); }

        .error-title {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--crimson-bright);
          margin: 0 0 1rem;
        }

        .error-body {
          font-family: var(--font-body);
          font-size: 0.95rem;
          color: var(--ivory-muted);
          margin: 0 0 1.75rem;
          line-height: 1.55;
        }

        .btn-action {
          display: block;
          width: 100%;
          padding: 0.625rem 1.25rem;
          background: var(--void-raised);
          border: var(--rule-thin);
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ivory);
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 0.75rem;
          text-align: center;
        }
        .btn-action:hover {
          background: var(--crimson);
          border-color: var(--crimson-bright);
          box-shadow: 0 0 16px var(--crimson-glow);
        }

        .return-link {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--gold);
          text-decoration: none;
          transition: color 0.2s;
        }
        .return-link:hover {
          color: var(--gold-light);
        }
      `}</style>

      <div className="error-card">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />

        <h1 className="error-title">Access Restricted</h1>
        <p className="error-body">
          This application is currently in private beta. Contact the administrator for access.
        </p>

        <button onClick={handleSignOut} className="btn-action" type="button">
          Sign Out
        </button>
        <Link href="/" className="return-link">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
