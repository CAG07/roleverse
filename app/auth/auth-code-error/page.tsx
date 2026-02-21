export default function AuthCodeErrorPage() {
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

        .btn-return {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.5rem;
          background: var(--crimson);
          border: 1px solid var(--crimson-bright);
          font-family: var(--font-heading);
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ivory);
          text-decoration: none;
          transition: all 0.2s;
        }
        .btn-return:hover {
          background: var(--crimson-bright);
          box-shadow: 0 0 16px var(--crimson-glow);
        }
      `}</style>

      <div className="error-card">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />

        <h1 className="error-title">Authentication Failed</h1>
        <p className="error-body">Something went wrong during sign in. Please try again.</p>
        <a href="/" className="btn-return">
          Back to Sign In
        </a>
      </div>
    </main>
  );
}
