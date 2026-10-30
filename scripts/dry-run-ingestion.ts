// scripts/dry-run-ingestion.ts
// Runs a system's fetcher and chunker without embedding or writing anything, then
// prints chunk counts per category and a few sample chunks. Use it to check a
// fetcher before spending Voyage credits on the real "Ingest Rules Embeddings" run.
//
//   npx tsx scripts/dry-run-ingestion.ts <system> [samples]
import { chunkText } from '../lib/rag/chunk';
import { streamChunksForSystem, type IngestableSystem } from '../lib/rag/ingest';

async function main() {
  const system = process.argv[2] as IngestableSystem;
  const samples = Number(process.argv[3] ?? 3);
  if (!system) {
    console.error('Usage: tsx scripts/dry-run-ingestion.ts <system> [samples]');
    process.exit(1);
  }

  const byCategory = new Map<string, { records: number; chunks: number; chars: number }>();
  const sampleRecords: string[] = [];
  let records = 0;

  for await (const record of streamChunksForSystem(system)) {
    records++;
    const pieces = chunkText(record.content);
    const stat = byCategory.get(record.metadata.category) ?? { records: 0, chunks: 0, chars: 0 };
    stat.records++;
    stat.chunks += pieces.length;
    stat.chars += record.content.length;
    byCategory.set(record.metadata.category, stat);
    if (records % Math.max(1, Math.floor(records / samples) + 50) === 1 && sampleRecords.length < samples) {
      sampleRecords.push(`--- ${record.metadata.title} [${record.metadata.category}]\n${pieces[0]}`);
    }
  }

  console.log(`[${system}] ${records} records`);
  let totalChunks = 0;
  for (const [category, s] of [...byCategory].sort()) {
    totalChunks += s.chunks;
    console.log(`  ${category.padEnd(12)} records ${String(s.records).padStart(6)}  chunks ${String(s.chunks).padStart(6)}  chars ${s.chars}`);
  }
  console.log(`  total chunks after splitting: ${totalChunks}`);
  for (const sample of sampleRecords) console.log(`\n${sample}`);
}

main().catch((err) => {
  console.error('✗ Fatal:', err);
  process.exit(1);
});
