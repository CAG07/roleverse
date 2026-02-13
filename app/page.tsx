import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Decorative top border */}
      <div className="rpg-divider mb-8 w-64" />

      {/* Logo / Title Area */}
      <div className="mb-8 text-center">
        {/* D20 icon */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full text-gold-accent drop-shadow-lg"
            fill="currentColor"
          >
            <polygon
              points="50,5 95,30 95,70 50,95 5,70 5,30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <polygon
              points="50,5 95,30 50,50 5,30"
              fill="currentColor"
              opacity="0.2"
            />
            <polygon
              points="95,30 95,70 50,50"
              fill="currentColor"
              opacity="0.1"
            />
            <polygon
              points="50,95 95,70 50,50 5,70"
              fill="currentColor"
              opacity="0.15"
            />
            <text
              x="50"
              y="58"
              textAnchor="middle"
              fontSize="24"
              fontFamily="MedievalSharp, Georgia, serif"
              fill="currentColor"
            >
              20
            </text>
          </svg>
        </div>

        <h1 className="rpg-title mb-2 text-5xl tracking-wide md:text-6xl">
          RoleVerse
        </h1>
        <p className="font-body text-lg tracking-wide text-ink-brown/70 md:text-xl">
          AI-Powered Tabletop RPG Companion
        </p>
      </div>

      {/* Decorative divider */}
      <div className="rpg-divider mb-8 w-48" />

      {/* Sign In Card */}
      <div className="rpg-card w-full max-w-sm text-center">
        <h2 className="mb-2 font-medieval text-2xl text-ink-brown">
          Begin Your Quest
        </h2>
        <p className="mb-6 text-sm text-ink-brown/60">
          Sign in to manage your campaigns, characters, and embark on epic
          adventures.
        </p>

        <GoogleSignInButton />
      </div>

      {/* Decorative bottom area */}
      <div className="rpg-divider mt-8 w-64" />

      <footer className="mt-4 text-center text-xs text-ink-brown/40">
        <p>
          Supports AD&amp;D 1E/2E &bull; D&amp;D 3.5/4E/5E &bull; Pathfinder
          &bull; DCC &bull; The One Ring &bull; Cyberpunk 2020
        </p>
      </footer>
    </main>
  );
}
