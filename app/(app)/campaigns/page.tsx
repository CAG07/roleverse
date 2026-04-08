import { createClient } from '@/lib/supabase/server';
import { CampaignsPage } from '@/components/campaign/CampaignsPage';

export default async function CampaignsRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, description, game_system, created_at, updated_at')
    .eq('owner_id', user!.id)
    .order('updated_at', { ascending: false });

  return <CampaignsPage campaigns={campaigns ?? []} />;
}
