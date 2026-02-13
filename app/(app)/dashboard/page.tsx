import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CampaignList } from '@/components/campaign/CampaignList';
import { Button } from '@/components/ui/button';
import { Plus, ScrollText } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, description, game_system, created_at')
    .eq('owner_id', user!.id)
    .order('updated_at', { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="rpg-title text-3xl">Your Campaigns</h1>
          <p className="mt-1 text-sm text-brown/70">Manage your tabletop RPG adventures</p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {campaigns && campaigns.length > 0 ? (
        <CampaignList campaigns={campaigns} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gold/50 py-16 text-center">
          <ScrollText className="mb-4 h-12 w-12 text-gold/60" />
          <h2 className="mb-2 font-medieval text-xl text-brown">No Campaigns Yet</h2>
          <p className="mb-6 max-w-sm text-sm text-brown/60">
            Begin your first adventure by creating a new campaign. Choose your game system and
            gather your party!
          </p>
          <Link href="/campaigns/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Campaign
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
