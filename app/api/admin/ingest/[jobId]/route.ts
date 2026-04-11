// app/api/admin/ingest/[jobId]/route.ts
// GET /api/admin/ingest/[jobId] — poll the status of a single ingestion job

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;

  const { data: job, error } = await supabase
    .from('ingestion_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    // RLS will return a "not found" error if the user doesn't own the job
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({ job });
}
