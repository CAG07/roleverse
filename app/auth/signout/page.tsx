'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    const signOut = async () => {
      const supabase = createClient();
      try {
        await supabase.auth.signOut();
      } finally {
        router.push('/');
      }
    };

    signOut();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rpg-card text-center">
        <h1 className="mb-4 rpg-title text-3xl">Farewell, Adventurer</h1>
        <p className="text-brown/70">Ending your session&hellip;</p>
      </div>
    </main>
  );
}
