// scripts/run-ingestion.ts
import { createClient } from '@supabase/supabase-js';
import { ingestSystem, type IngestableSystem } from '../lib/rag/ingest';

const VALID_SYSTEMS: IngestableSystem[] = ['5E_2014', 'ADD2E', 'PATHFINDER_2E', 'DCC'];

async function main() {
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
      `  NEXT_PUBLIC_SUPABASE_URL:  ${url ? '✓' : '✗ MISSING'}\n` +
      `  SUPABASE_SERVICE_ROLE_KEY: ${serviceKey ? '✓' : '✗ MISSING'}\n` +
      `  VOYAGE_API_KEY:            ${voyageKey ? '✓' : '✗ MISSING'}`
    );
    process.exit(1);
  }

  const sourceLabel =
    system === '5E_2014' ? 'open5e' :
    system === 'ADD2E' ? 'osric' :
    system === 'DCC' ? 'dcc-stub' :
    'pf2e-foundry';

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

  const result = await ingestSystem({ gameSystem: system, jobId: job.id });

  console.log(
    `[${system}] ✓ Complete\n` +
    `  Generation:       ${result.generation}\n` +
    `  Chunks processed: ${result.chunksProcessed}\n` +
    `  Chunks upserted:  ${result.chunksUpserted}`
  );
}

main().catch((err) => {
  console.error('✗ Fatal:', err);
  process.exit(1);
});