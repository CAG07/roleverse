import { CampaignCard, type CampaignData } from './CampaignCard';

export function CampaignList({ campaigns }: { campaigns: CampaignData[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}
