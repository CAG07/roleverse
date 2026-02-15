'use client';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rpg-card text-center">
        <h1 className="mb-4 rpg-title text-3xl">Access Restricted</h1>
        <p className="mb-6 text-brown/70">
          This application is currently in private beta. Contact the administrator for access.
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Sign Out
          </Button>
          <Link href="/" className="text-sm text-teal hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
