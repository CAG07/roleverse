// app/api/campaigns/[id]/cover-from-pdf/route.ts
// POST — accepts a single-page PDF (e.g. a "print to PDF" of just a module's
// cover), rasterizes page 1 server-side (lib/images/pdf-cover-image.ts — the
// underlying @napi-rs/canvas renderer is a Node native addon and can't run
// in the browser, which is why this needs a route at all; every other
// cover-image write in the app happens directly from the client via the
// Supabase client SDK), and uploads the result to the same 'campaign-covers'
// path the browser-upload flow already writes to
// (components/campaign/EditCampaignPage.tsx), so either upload method
// always overwrites the same object.

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { renderPdfCoverToJpeg } from '@/lib/images/pdf-cover-image';
import { COVER_IMAGE_MAX_DIMENSION_PX, PDF_COVER_MAX_BYTES } from '@/lib/images/cover-image-constants';

const BUCKET = 'campaign-covers';

// PDF rasterization has similar latency characteristics to the module-ingest
// route's PDF parsing, which already needed this same extension.
export const maxDuration = 60;

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ownership check happens before any parsing/rendering work — rasterization
  // is the expensive part of this route and must not be reachable by anyone
  // but the campaign's owner.
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, owner_id')
    .eq('id', id)
    .single();
  if (!campaign || campaign.owner_id !== user.id) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Fast reject on the declared length before reading the body at all. Not
  // trusted on its own (a client can lie), so the actual byte length is
  // re-checked below — this is just to avoid buffering an obviously
  // oversized upload.
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > PDF_COVER_MAX_BYTES) {
    return NextResponse.json({ error: 'PDF must be 8MB or smaller.' }, { status: 413 });
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: 'Empty upload.' }, { status: 400 });
  }
  if (bytes.byteLength > PDF_COVER_MAX_BYTES) {
    return NextResponse.json({ error: 'PDF must be 8MB or smaller.' }, { status: 413 });
  }

  // Content-Type is caller-declared and untrusted; validity is only ever
  // established by successfully parsing the bytes as a PDF below.
  let jpeg: Buffer;
  try {
    jpeg = await renderPdfCoverToJpeg(Buffer.from(bytes), COVER_IMAGE_MAX_DIMENSION_PX);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't read this file as a PDF.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const path = `${user.id}/${id}/cover.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, jpeg, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
