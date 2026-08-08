// app/api/campaigns/[id]/modules/ingest/route.ts
// POST — index (or re-index) one uploaded module PDF from the 'campaign-pdfs'
// Storage bucket into campaign_embeddings, so the Rules Arbiter can retrieve it
// (the Lore Keeper does not do RAG search). DELETE — remove a file's indexed
// chunks (called when the PDF itself is deleted from Storage, so RAG content
// doesn't outlive its source).

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { ingestCampaignPdf, deleteIndexedPdfChunks } from '@/lib/rag/ingest-campaign-pdf';

type RouteParams = { params: Promise<{ id: string }> };

const BUCKET = 'campaign-pdfs';

// Map-page vision transcription (lib/rag/ingest-campaign-pdf.ts) adds several
// sequential-ish Claude vision calls on top of the existing parse/chunk/embed
// work, which can exceed the default serverless timeout.
export const maxDuration = 60;

async function authAndCampaign(campaignId: string) {
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { error, status, supabase, user, gameSystem } = await authAndCampaign(id);

  if (error || !supabase || !user || !gameSystem) {
    return NextResponse.json({ error }, { status });
  }

  let fileName: string;
  try {
    const body = (await request.json()) as { fileName?: string };
    if (!body.fileName) {
      return NextResponse.json({ error: 'Missing required field: fileName' }, { status: 400 });
    }
    fileName = body.fileName;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const path = `${user.id}/${id}/${fileName}`;
  const { data: fileBlob, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
  if (downloadError || !fileBlob) {
    return NextResponse.json(
      { error: downloadError?.message ?? 'File not found in storage' },
      { status: 404 }
    );
  }

  try {
    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
    const result = await ingestCampaignPdf({
      supabase,
      campaignId: id,
      userId: user.id,
      gameSystem,
      fileName,
      fileBuffer,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to index file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { error, status, supabase } = await authAndCampaign(id);

  if (error || !supabase) {
    return NextResponse.json({ error }, { status });
  }

  let fileName: string;
  try {
    const body = (await request.json()) as { fileName?: string };
    if (!body.fileName) {
      return NextResponse.json({ error: 'Missing required field: fileName' }, { status: 400 });
    }
    fileName = body.fileName;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    await deleteIndexedPdfChunks(supabase, id, fileName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete indexed chunks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
