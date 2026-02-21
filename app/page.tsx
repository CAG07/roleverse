import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignInPage } from '@/components/auth/SignInPage';

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return <SignInPage />;
}
