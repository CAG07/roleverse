'use client';

import Image from 'next/image';
import { GoogleSignInButton } from './GoogleSignInButton';

export function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Logo / Title Area */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 rpg-title text-5xl tracking-wide md:text-6xl">RoleVerse</h1>
        <p className="font-body text-lg tracking-wide text-brown/70 md:text-xl">
          AI-Powered Tabletop RPG Companion
        </p>
      </div>

      {/* Decorative divider */}
      <div className="rpg-divider mb-8 w-48" />

      {/* Sign In Card */}
      <div className="w-full max-w-sm rpg-card text-center">
        {/* D20 icon inside card */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <Image src="/dice-d20.svg" alt="D20 die" width={64} height={64} className="opacity-80" />
        </div>

        <h2 className="mb-2 font-medieval text-2xl text-brown">Begin Your Quest</h2>
        <p className="mb-6 text-sm text-brown/60">
          Sign in to manage your campaigns, characters, and embark on epic adventures.
        </p>

        <GoogleSignInButton />
      </div>

      {/* Decorative bottom area */}
      <div className="rpg-divider mt-8 w-64" />

      <footer className="mt-4 text-center text-xs text-brown/40">
        <p>
          Supports AD&amp;D 1E/2E &bull; D&amp;D 3.5/4E/5E &bull; Pathfinder &bull; DCC &bull; The
          One Ring &bull; Cyberpunk 2020
        </p>
      </footer>
    </main>
  );
}
