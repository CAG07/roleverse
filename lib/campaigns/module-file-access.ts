// lib/campaigns/module-file-access.ts
// Shared by the module ingest and map routes: confirms the signed-in user owns
// the campaign, and downloads one of its uploaded module files.

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const MODULE_BUCKET = 'campaign-pdfs';

type CampaignAccess =
  | { error: string; status: number; supabase: null; user: null; gameSystem: null }
  | { error: null; status: 200; supabase: SupabaseClient; user: User; gameSystem: string };

export async function authAndCampaign(campaignId: string): Promise<CampaignAccess> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { error: 'Unauthorized', status: 401, supabase: null, user: null, gameSystem: null };

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, owner_id, game_system')
    .eq('id', campaignId)
    .single();

  if (!campaign || campaign.owner_id !== user.id) {
    return { error: 'Campaign not found', status: 404, supabase: null, user: null, gameSystem: null };
  }

  return { error: null, status: 200, supabase, user, gameSystem: campaign.game_system as string };
}

/** Downloads a module file from the campaign's storage folder; returns an error message on failure. */
export async function downloadModuleFile(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string,
  fileName: string
): Promise<{ buffer: Buffer; error: null } | { buffer: null; error: string }> {
  const { data, error } = await supabase.storage
    .from(MODULE_BUCKET)
    .download(`${userId}/${campaignId}/${fileName}`);
  if (error || !data) return { buffer: null, error: error?.message ?? 'File not found in storage' };
  return { buffer: Buffer.from(await data.arrayBuffer()), error: null };
}
