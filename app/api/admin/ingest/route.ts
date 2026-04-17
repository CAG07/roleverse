// app/api/admin/ingest/route.ts
// POST /api/admin/ingest  — start a new ingestion job for a game system
// GET  /api/admin/ingest  — list recent ingestion jobs
//
// Admin-gated via ADMIN_EMAILS env var (comma-separated list of authorised emails).

import { NextRequest, NextResponse } from 'next/server';

import { ingestSystem, type IngestableSystem } from '@/lib/rag/ingest';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const VALID_SYSTEMS: IngestableSystem[] = ['5E_2014', 'PATHFINDER_2E', 'ADD2E'];

const SOURCE_LABELS: Record<IngestableSystem, string> = {
  '5E_2014': 'open5e',
  PATHFINDER_2E: 'pf2e-foundry',
  ADD2E: 'osric',
};

/** Return the list of emails authorised to trigger ingestion */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Check whether the authenticated user is an admin */
async function requireAdmin(): Promise<
  | { user: { id: string; email: string }; error: null }
  | { user: null; error: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const adminEmails = getAdminEmails();
  const userEmail = (user.email ?? '').toLowerCase();

  if (adminEmails.length > 0 && !adminEmails.includes(userEmail)) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 }),
    };
  }

  return { user: { id: user.id, email: user.email! }, error: null };
}

// ---------------------------------------------------------------------------
// GET /api/admin/ingest — list recent jobs
// ---------------------------------------------------------------------------

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ingestion_jobs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: data ?? [] });
}

// ---------------------------------------------------------------------------
// POST /api/admin/ingest — start ingestion
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: { gameSystem?: string };
  try {
    body = (await request.json()) as { gameSystem?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { gameSystem } = body;

  if (!gameSystem || !VALID_SYSTEMS.includes(gameSystem as IngestableSystem)) {
    return NextResponse.json(
      {
        error: `Invalid gameSystem. Must be one of: ${VALID_SYSTEMS.join(', ')}`,
      },
      { status: 400 }
    );
  }

  const system = gameSystem as IngestableSystem;

  // requireAdmin() already ensures user is non-null when there is no error,
  // but use a runtime guard to satisfy strict null checks.
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Create the ingestion_jobs row via service role.
  // Auth is already enforced by requireAdmin() above; the service role
  // bypasses RLS so the insert is not blocked by a missing INSERT policy.
  const adminDb = createAdminClient();
  const { data: job, error: jobError } = await adminDb
    .from('ingestion_jobs')
    .insert({
      game_system: system,
      source_label: SOURCE_LABELS[system],
      status: 'pending',
      started_by: auth.user.id,
    })
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { error: jobError?.message ?? 'Failed to create ingestion job' },
      { status: 500 }
    );
  }

  // Run ingestion asynchronously -- fire and forget.
  // ingestSystem handles its own error state via the try-catch in its body,
  // which marks the job as 'failed' in the DB. The outer .catch catches any
  // synchronous throw (e.g., missing env vars) before that try-catch is reached.
  void ingestSystem({ gameSystem: system, jobId: job.id }).catch(async (err: unknown) => {
    console.error(`Ingestion failed for ${system} (job ${job.id}):`, err);
    // Belt-and-suspenders: ensure job is marked failed even if ingestSystem threw
    // before its own error handler ran. Use the admin client because this runs
    // outside of the request context and has no auth session.
    const adminDb = createAdminClient();
    await adminDb
      .from('ingestion_jobs')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : String(err),
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('status', 'pending');
  });

  return NextResponse.json({ jobId: job.id, status: 'pending' }, { status: 202 });
}
