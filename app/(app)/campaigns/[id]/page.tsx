import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getGameSystem } from '@/lib/game-systems/registry';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Upload, Users, ArrowLeft } from 'lucide-react';

interface CampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (!campaign || campaign.owner_id !== user?.id) {
    notFound();
  }

  let systemName = campaign.game_system;
  let systemDescription = '';
  try {
    const system = getGameSystem(campaign.game_system);
    systemName = system.name;
    systemDescription = system.description;
  } catch {
    // Use raw slug if system is not registered
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-brown/60 hover:text-brown"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Campaign header */}
      <div className="mb-6">
        <div className="flex items-start gap-3">
          <h1 className="rpg-title text-3xl">{campaign.name}</h1>
          <Badge variant="teal">{systemName}</Badge>
        </div>
        {campaign.description && (
          <p className="mt-2 text-brown/70">{campaign.description}</p>
        )}
        {systemDescription && (
          <p className="mt-1 text-xs text-brown/50">{systemDescription}</p>
        )}
      </div>

      {/* Action cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href={`/campaigns/${id}/session`}>
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg rpg-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Play className="h-5 w-5 text-teal" />
                Start Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-brown/60">
                Begin a new game session with your party.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/campaigns/${id}/upload`}>
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg rpg-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-5 w-5 text-gold" />
                Upload PDFs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-brown/60">
                Upload rulebooks and reference materials.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/campaigns/${id}/characters`}>
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg rpg-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-rust" />
                Characters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-brown/60">
                View and manage party characters.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Placeholder sections */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="rpg-border">
          <CardHeader>
            <CardTitle className="text-base">Party Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-brown/50">
              Party management coming soon.
            </p>
          </CardContent>
        </Card>

        <Card className="rpg-border">
          <CardHeader>
            <CardTitle className="text-base">Session History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-brown/50">
              Session logs coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
