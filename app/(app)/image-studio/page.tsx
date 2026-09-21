import { createClient } from '@/lib/supabase/server';
import { StudioCampaignPicker } from '@/components/campaign/StudioCampaignPicker';

export default async function ImageStudioRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, cover_image_url')
    .eq('owner_id', user!.id)
    .order('updated_at', { ascending: false });

  return <StudioCampaignPicker campaigns={campaigns ?? []} />;
}
