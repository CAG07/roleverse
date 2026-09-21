import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StudioPage } from '@/components/campaign/StudioPage';
import { listCampaignVideos } from '@/lib/campaigns/studio-media';

interface StudioRouteProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignStudioRoute({ params }: StudioRouteProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, cover_image_url, owner_id')
    .eq('id', id)
    .single();

  if (!campaign || campaign.owner_id !== user?.id) {
    notFound();
  }

  const [{ data: characters }, videos] = await Promise.all([
    supabase.from('characters').select('id, name, avatar_url').eq('campaign_id', id),
    listCampaignVideos(supabase, id),
  ]);

  return (
    <StudioPage
      campaignId={id}
      campaignName={campaign.name}
      coverImageUrl={campaign.cover_image_url}
      characters={characters ?? []}
      videos={videos}
    />
  );
}
