// app/api/campaigns/[id]/modules/maps/route.ts
// Map reading for uploaded module PDFs, run after a file's text is indexed
// (../ingest/route.ts). Split into small requests so no single one has to
// read every map, with progress saved in public.module_map_scans so an
// interrupted scan resumes the next time the campaign is opened:
// GET                — every map scan in this campaign (status and results).
// PUT  { fileName }  — start (or restart, for "Re-scan maps") a scan: find
//                      which pages hold maps.
// POST { fileName }  — read the scan's next unread map page and save its rooms.
// PUT and POST return 409 { busy: true } while another request is working on
// the same scan (a second tab, or a page still finishing after a reload).

import { NextRequest, NextResponse } from 'next/server';

import { findMapPages, indexMapPage, type MapPageContext } from '@/lib/rag/index-map-pages';
import {
  claimNewScan,
  claimReadingScan,
  finishFindingPages,
  listMapScans,
  nextUnreadPage,
  recordPageResult,
} from '@/lib/rag/map-scans';
import { authAndCampaign, downloadModuleFile } from '@/lib/campaigns/module-file-access';

type RouteParams = { params: Promise<{ id: string }> };

// Reading a large map (40+ rooms with exits) is one long vision call; finding
// map pages renders a thumbnail of every page. Both can pass 60 seconds.
// lib/rag/map-scans.ts treats a claim older than this as abandoned.
export const maxDuration = 300;

const BUSY = { error: 'Maps for this file are already being read.', busy: true };

async function readPdfFileName(request: NextRequest): Promise<string | NextResponse> {
  let body: { fileName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.fileName) {
    return NextResponse.json({ error: 'Missing required field: fileName' }, { status: 400 });
  }
  if (!body.fileName.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files contain maps.' }, { status: 400 });
  }
  return body.fileName;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const access = await authAndCampaign(id);
  if (access.error !== null) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    return NextResponse.json({ scans: await listMapScans(access.supabase, id) });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, 'Failed to load map scans') }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const access = await authAndCampaign(id);
  if (access.error !== null) return NextResponse.json({ error: access.error }, { status: access.status });
  const fileName = await readPdfFileName(request);
  if (fileName instanceof NextResponse) return fileName;

  const { supabase, user } = access;
  try {
    if (!(await claimNewScan(supabase, id, user.id, fileName))) {
      return NextResponse.json(BUSY, { status: 409 });
    }
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, 'Failed to start the map scan') }, { status: 500 });
  }

  try {
    const file = await downloadModuleFile(supabase, user.id, id, fileName);
    if (file.error !== null) throw new Error(file.error);
    const mapPages = await findMapPages({
      supabase,
      campaignId: id,
      userId: user.id,
      gameSystem: access.gameSystem,
      fileName,
      fileBuffer: file.buffer,
    });
    await finishFindingPages(supabase, id, fileName, { mapPages });
    return NextResponse.json({ mapPages });
  } catch (err) {
    const message = errorMessage(err, 'Failed to look for maps.');
    await finishFindingPages(supabase, id, fileName, { error: message }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const access = await authAndCampaign(id);
  if (access.error !== null) return NextResponse.json({ error: access.error }, { status: access.status });
  const fileName = await readPdfFileName(request);
  if (fileName instanceof NextResponse) return fileName;

  const { supabase, user } = access;
  try {
    const scan = await claimReadingScan(supabase, id, fileName);
    if (!scan) return NextResponse.json(BUSY, { status: 409 });

    const pageNumber = nextUnreadPage(scan);
    if (pageNumber === null) {
      return NextResponse.json({ scan: await recordPageResult(supabase, id, scan, null) });
    }

    // A page that throws (download, embedding, or save failure) is recorded as
    // unreadable, so the scan moves on instead of retrying it forever.
    let result;
    try {
      const file = await downloadModuleFile(supabase, user.id, id, fileName);
      if (file.error !== null) throw new Error(file.error);
      const ctx: MapPageContext = {
        supabase,
        campaignId: id,
        userId: user.id,
        gameSystem: access.gameSystem,
        fileName,
        fileBuffer: file.buffer,
      };
      result = await indexMapPage(ctx, pageNumber);
    } catch (err) {
      console.warn(`[maps] Failed to read map page ${pageNumber} of ${fileName}:`, err);
      result = { pageNumber, mapsFound: 0, roomsFound: 0, truncated: false, read: false };
    }

    return NextResponse.json({ scan: await recordPageResult(supabase, id, scan, result) });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, 'Failed to read map page') }, { status: 500 });
  }
}
