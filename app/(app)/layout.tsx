import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const fullName = user.user_metadata?.full_name ?? user.email ?? 'Adventurer';

  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar userName={fullName} userInitials={initials} />
      <main
        style={{
          flex: 1,
          marginLeft: 'var(--sidebar-width)',
          minHeight: '100vh',
          background: 'var(--void)',
          overflowY: 'auto',
        }}
      >
        {children}
      </main>
    </div>
  );
}
