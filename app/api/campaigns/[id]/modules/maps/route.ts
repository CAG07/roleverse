// app/api/campaigns/[id]/modules/maps/route.ts
// Map indexing for an uploaded module PDF, run after its text is indexed
// (../ingest/route.ts). Split into small requests so no single one has to
// read every map:
// PUT  { fileName }             — clear this file's map data and find which
//                                 pages hold maps (also "Re-scan maps").
// POST { fileName, pageNumber } — read one map page and save its rooms.

import { NextRequest, NextResponse } from 'next/server';

import { findMapPages, indexMapPage } from '@/lib/rag/index-map-pages';
import { authAndCampaign, downloadModuleFile } from '@/lib/campaigns/module-file-access';

type RouteParams = { params: Promise<{ id: string }> };

// Reading a large map (40+ rooms with exits) is one long vision call; finding
// map pages renders a thumbnail of every page. Both can pass 60 seconds.
export const maxDuration = 300;

async function setup(request: NextRequest, campaignId: string) {
  const access = await authAndCampaign(campaignId);
  if (access.error !== null) {
    return { response: NextResponse.json({ error: access.error }, { status: access.status }) };
  }

  let body: { fileName?: string; pageNumber?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return { response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) };
  }
  if (!body.fileName) {
    return { response: NextResponse.json({ error: 'Missing required field: fileName' }, { status: 400 }) };
  }
  if (!body.fileName.toLowerCase().endsWith('.pdf')) {
    return { response: NextResponse.json({ error: 'Only PDF files contain maps.' }, { status: 400 }) };
  }

  const file = await downloadModuleFile(access.supabase, access.user.id, campaignId, body.fileName);
  if (file.error !== null) {
    return { response: NextResponse.json({ error: file.error }, { status: 404 }) };
  }

  return {
    response: null,
    pageNumber: body.pageNumber,
    ctx: {
      supabase: access.supabase,
      campaignId,
      userId: access.user.id,
      gameSystem: access.gameSystem,
      fileName: body.fileName,
      fileBuffer: file.buffer,
    },
  };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const s = await setup(request, id);
  if (s.response) return s.response;

  try {
    const mapPages = await findMapPages(s.ctx);
    return NextResponse.json({ mapPages });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to find map pages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const s = await setup(request, id);
  if (s.response) return s.response;

  const pageNumber = Number(s.pageNumber);
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return NextResponse.json({ error: 'Missing or invalid field: pageNumber' }, { status: 400 });
  }

  try {
    const result = await indexMapPage(s.ctx, pageNumber);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read map page';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
