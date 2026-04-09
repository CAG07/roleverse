import { createClient } from '@/lib/supabase/server';
import { CampaignsListPage } from '@/components/campaigns/CampaignsListPage';

export default async function DashboardRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, description, game_system, created_at, updated_at')
    .eq('owner_id', user!.id)
    .order('updated_at', { ascending: false });

  return <CampaignsListPage campaigns={campaigns ?? []} />;
}

