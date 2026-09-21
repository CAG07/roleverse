import { createClient } from '@/lib/supabase/server';
import { WorkshopPage } from '@/components/workshop/WorkshopPage';

export default async function WorkshopRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: resources }, { data: submissions }] = await Promise.all([
    supabase
      .from('workshop_resources')
      .select('id, category, title, description, url, affiliate_url, is_affiliate, is_partner, game_systems')
      .order('title'),
    user
      ? supabase
          .from('workshop_submissions')
          .select('id, url, category, game_systems, license_type, description, status, decline_reason, created_at')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  return (
    <WorkshopPage
      resources={resources ?? []}
      mySubmissions={submissions ?? []}
      signedIn={!!user}
    />
  );
}
