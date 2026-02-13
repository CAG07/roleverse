'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getGameSystem } from '@/lib/game-systems/registry';
import { Calendar } from 'lucide-react';

export interface CampaignData {
  id: string;
  name: string;
  description: string | null;
  game_system: string;
  created_at: string;
}

export function CampaignCard({ campaign }: { campaign: CampaignData }) {
  let systemName = campaign.game_system;
  try {
    systemName = getGameSystem(campaign.game_system).name;
  } catch {
    // Use raw game_system slug if not found in registry
  }

  const formattedDate = new Date(campaign.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link href={`/campaigns/${campaign.id}`} className="block transition-transform hover:scale-[1.02]">
      <Card className="h-full rpg-border">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg text-brown">{campaign.name}</CardTitle>
            <Badge variant="teal">{systemName}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-brown/70">
            {campaign.description || 'No description yet.'}
          </p>
        </CardContent>
        <CardFooter>
          <div className="flex items-center gap-1 text-xs text-brown/50">
            <Calendar className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
