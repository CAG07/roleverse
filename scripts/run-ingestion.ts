// scripts/run-ingestion.ts
// Runs ingestion for a single game system.
// CI: env vars injected by GitHub Actions secrets.
// Local: falls back to .env.local if vars not already set.

import { createClient } from '@supabase/supabase-js';
import { ingestSystem, type IngestableSystem } from '../lib/rag/ingest';

// Only load .env.local locally — CI vars are already in the environment
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const dotenv = await import('dotenv');
    dotenv.config({ path: '.env.local' });
  } catch {
    // dotenv not available — CI environment, continue
  }
}

const VALID_SYSTEMS: IngestableSystem[] = ['5E_2014', 'ADD2E', 'PATHFINDER_2E'];
const system = process.argv[2] as IngestableSystem;

if (!VALID_SYSTEMS.includes(system)) {
  console.error(`Usage: tsx scripts/run-ingestion.ts <${VALID_SYSTEMS.join('|')}>`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const voyageKey = process.env.VOYAGE_API_KEY;

if (!url || !serviceKey || !voyageKey) {
  console.error(
    'Missing required environment variables:\n' +
    `  NEXT_PUBLIC_SUPABASE_URL: ${url ? '✓' : '✗'}\n` +
    `  SUPABASE_SERVICE_ROLE_KEY: ${serviceKey ? '✓' : '✗'}\n` +
    `  VOYAGE_API_KEY: ${voyageKey ? '✓' : '✗'}`
  );
  process.exit(1);
}

const sourceLabel = system === '5E_2014' ? 'open5e'
  : system === 'ADD2E' ? 'osric'
  : 'pf2e-foundry';

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

console.log(`[${system}] Creating ingestion job...`);

const { data: job, error: jobError } = await supabase
  .from('ingestion_jobs')
  .insert({
    game_system: system,
    source_label: sourceLabel,
    status: 'pending',
  })
  .select('id')
  .single();

if (jobError || !job) {
  console.error(`[${system}] Failed to create job:`, jobError?.message);
  process.exit(1);
}

console.log(`[${system}] Job ${job.id} created — starting ingestion...`);

try {
  const result = await ingestSystem({ gameSystem: system, jobId: job.id });
  console.log(
    `[${system}] ✓ Complete\n` +
    `  Chunks processed: ${result.chunksProcessed}\n` +
    `  Chunks upserted:  ${result.chunksUpserted}`
  );
} catch (err) {
  console.error(`[${system}] ✗ Failed:`, err);
  process.exit(1);
}
