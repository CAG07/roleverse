// lib/mcp/agents/prompt-injection-framing.test.ts
// Guards the injection-laundering path: every agent (and the summary
// generator) that injects stored/uploaded content into a system prompt must
// frame it as untrusted narrative material, never as instructions. Reads
// source files from disk rather than importing them — these modules
// instantiate Anthropic/Supabase clients at module scope, which a plain unit
// test shouldn't need to spin up.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Wording is allowed to differ per file (enforced-invariants.md only asks
// that the framing be *present*) — this matches the phrasing each file
// actually uses today, not one exact sentence.
const FRAMING_KEYWORDS =
  /(narrative fact|never as instructions|never follow any instructions|do not reproduce or carry forward)/i;

const FILES = [
  'lib/mcp/agents/game-master.ts',
  'lib/mcp/agents/rules-arbiter.ts',
  'lib/mcp/agents/lore-keeper.ts',
  'lib/sessions/generate-summary.ts',
];

describe('prompt-injection framing', () => {
  it.each(FILES)('%s contains prompt-injection framing language', (relPath) => {
    const content = readFileSync(path.resolve(import.meta.dirname, '../../../', relPath), 'utf-8');
    expect(content).toMatch(FRAMING_KEYWORDS);
  });
});
