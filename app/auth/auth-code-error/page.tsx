import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rpg-card text-center">
        <h1 className="mb-4 rpg-title text-3xl">Authentication Failed</h1>
        <p className="mb-6 text-brown/70">
          Something went wrong during sign in. Please try again.
        </p>
        <Link href="/" className="rpg-button inline-block text-lg hover:text-gold-light">
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
