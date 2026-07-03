// app/api/campaigns/[id]/sessions/[sessionId]/extract-npcs/route.ts
// Stubbed in B1 — session-end NPC extraction is rebuilt in B2.

import { NextRequest, NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string; sessionId: string }> };

export async function POST(_request: NextRequest, _context: RouteParams) {
  return NextResponse.json(
    { error: 'NPC extraction is being rebuilt. Available in B2.' },
    { status: 501 }
  );
}
