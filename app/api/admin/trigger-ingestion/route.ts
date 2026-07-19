// app/api/admin/trigger-ingestion/route.ts
// Triggers a GitHub Actions workflow dispatch for a specific game system.
// Requires GITHUB_PAT env var — a Personal Access Token with repo + actions:write scope.
// Requires GITHUB_REPO env var — e.g. 'CAG07/roleverse'

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_SYSTEMS = ['5E_2014', 'ADD2E', 'PATHFINDER_2E', 'DCC'] as const;
type IngestableSystem = (typeof VALID_SYSTEMS)[number];

export async function POST(request: NextRequest) {
  // Auth — must be signed in
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Optional: restrict to allowlisted emails
  const allowedEmails = process.env.ALLOWED_EMAILS?.split(',').map(e => e.trim().toLowerCase()) ?? [];
  if (allowedEmails.length > 0 && !allowedEmails.includes(user.email?.toLowerCase() ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { system?: string };
  try {
    body = await request.json() as { system?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { system } = body;
  if (!system || !VALID_SYSTEMS.includes(system as IngestableSystem)) {
    return NextResponse.json(
      { error: `system must be one of: ${VALID_SYSTEMS.join(', ')}` },
      { status: 400 }
    );
  }

  const pat = process.env.GITHUB_PAT;
  const repo = process.env.GITHUB_REPO; // e.g. 'CAG07/roleverse'
  const workflow = 'ingest-rules.yml';

  if (!pat || !repo) {
    return NextResponse.json(
      { error: 'GITHUB_PAT and GITHUB_REPO must be set in environment' },
      { status: 500 }
    );
  }

  const dispatchUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;

  const ghResponse = await fetch(dispatchUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${pat}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: { system },
    }),
  });

  // GitHub returns 204 No Content on success
  if (ghResponse.status === 204) {
    return NextResponse.json({
      success: true,
      message: `Ingestion workflow dispatched for ${system}. Check GitHub Actions for progress.`,
      system,
    });
  }

  const errorText = await ghResponse.text();
  return NextResponse.json(
    { error: `GitHub API error: ${ghResponse.status} — ${errorText}` },
    { status: 502 }
  );
}
