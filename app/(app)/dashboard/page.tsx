import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardOnboarding } from '@/components/dashboard/DashboardOnboarding';

export default async function DashboardRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  // 1. Active session? Resume it.
  const { data: activeSession } = await supabase
    .from('sessions')
    .select('id, campaign_id')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSession) {
    redirect(`/campaigns/${activeSession.campaign_id}/session`);
  }

  // 2. No active session — fall through to most recent campaign.
  const { data: recentCampaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentCampaign) {
    redirect(`/campaigns/${recentCampaign.id}`);
  }

  // 3. No campaigns at all — onboarding.
  return (
    <DashboardOnboarding
      userName={user?.user_metadata?.full_name ?? 'Adventurer'}
    />
  );
}


