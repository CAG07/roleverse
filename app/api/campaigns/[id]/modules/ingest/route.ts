// app/api/campaigns/[id]/modules/ingest/route.ts
// POST — index (or re-index) one uploaded module file's text from the
// 'campaign-pdfs' Storage bucket into campaign_embeddings, so the Game Master
// and Rules Arbiter can retrieve it (the Lore Keeper does not do RAG search).
// Map pages are found and read afterwards through ../maps/route.ts.
// DELETE — remove a file's indexed chunks, map chunks included, and its map
// scan progress (called when the file itself is deleted from Storage, so RAG
// content doesn't outlive its source).

import { NextRequest, NextResponse } from 'next/server';

import { ingestCampaignPdf, deleteIndexedPdfChunks } from '@/lib/rag/ingest-campaign-pdf';
import { deleteMapScan } from '@/lib/rag/map-scans';
import { deleteMapImages } from '@/lib/rag/map-images';
import { authAndCampaign, downloadModuleFile } from '@/lib/campaigns/module-file-access';

type RouteParams = { params: Promise<{ id: string }> };

export const maxDuration = 60;

async function readFileName(request: NextRequest): Promise<string | NextResponse> {
  try {
    const body = (await request.json()) as { fileName?: string };
    if (!body.fileName) {
      return NextResponse.json({ error: 'Missing required field: fileName' }, { status: 400 });
    }
    return body.fileName;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { error, status, supabase, user, gameSystem } = await authAndCampaign(id);

  if (error || !supabase || !user || !gameSystem) {
    return NextResponse.json({ error }, { status });
  }

  const fileName = await readFileName(request);
  if (fileName instanceof NextResponse) return fileName;

  const file = await downloadModuleFile(supabase, user.id, id, fileName);
  if (file.error !== null) {
    return NextResponse.json({ error: file.error }, { status: 404 });
  }

  try {
    const result = await ingestCampaignPdf({
      supabase,
      campaignId: id,
      userId: user.id,
      gameSystem,
      fileName,
      fileBuffer: file.buffer,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to index file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { error, status, supabase, user } = await authAndCampaign(id);

  if (error || !supabase) {
    return NextResponse.json({ error }, { status });
  }

  const fileName = await readFileName(request);
  if (fileName instanceof NextResponse) return fileName;

  try {
    await deleteIndexedPdfChunks(supabase, id, fileName);
    await deleteMapScan(supabase, id, fileName);
    await deleteMapImages(supabase, user.id, id, fileName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete indexed chunks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
