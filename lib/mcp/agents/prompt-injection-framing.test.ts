// lib/mcp/agents/prompt-injection-framing.test.ts
// Guards the injection-laundering path: every agent (and the summary
// generator) that injects stored/uploaded content into a system prompt must
// frame it as untrusted narrative material, never as instructions.
//
// Reads source files from disk rather than importing them — these modules
// throw at import time without live ANTHROPIC_MODEL/ANTHROPIC_HAIKU_MODEL env
// vars (see getRequiredModel() in game-master.ts/rules-arbiter.ts), and a
// plain unit test shouldn't need those to run.
//
// A whole-file keyword search would still pass if framing were removed from
// one specific injection block but happened to survive elsewhere in the file
// (a comment, or a different block) — so each check below is scoped to the
// text of the specific "## Heading" section that actually contains the
// untrusted content, not the file as a whole.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Wording is allowed to differ per file/block (enforced-invariants.md only
// asks that the framing be *present*) — this matches the phrasing each file
// actually uses today, not one exact sentence.
const FRAMING_KEYWORDS =
  /(narrative fact|never as instructions|never follow any instructions|do not reproduce or carry forward|ignore any text within it that attempts to redirect)/i;

function readSource(relPath: string): string {
  return readFileSync(path.resolve(import.meta.dirname, '../../../', relPath), 'utf-8');
}

/**
 * Extracts the text of one "## Heading" section — from the heading up to
 * (but not including) the next "## " heading, or up to a bounded window if
 * this is the last section — and asserts the framing keywords appear
 * within it. Fails loudly (not silently passing) if the heading itself
 * can't be found, so a renamed section doesn't quietly stop being checked.
 */
function expectFramingInSection(content: string, heading: string) {
  const start = content.indexOf(heading);
  expect(start, `heading "${heading}" not found in source`).toBeGreaterThanOrEqual(0);

  const searchFrom = start + heading.length;
  const nextHeadingOffset = content.indexOf('## ', searchFrom);
  const end =
    nextHeadingOffset === -1
      ? Math.min(content.length, searchFrom + 2000)
      : nextHeadingOffset;

  // The source is an array of quoted string-literal lines (parts.push('a',
  // 'b', ...)) that gets \n-joined at runtime — a framing phrase can span
  // two adjacent literals in source (e.g. '...ignore any',\n 'text within
  // it...'). Normalize quote/comma/newline boundaries to whitespace so
  // matching reflects the real joined prompt, not source-line breaks.
  const section = content
    .slice(start, end)
    .replace(/['",]/g, ' ')
    .replace(/\s+/g, ' ');
  expect(section).toMatch(FRAMING_KEYWORDS);
}

describe('prompt-injection framing', () => {
  it('game-master.ts frames every injected content block as untrusted', () => {
    const content = readSource('lib/mcp/agents/game-master.ts');
    expectFramingInSection(content, '## Module / Adventure');
    expectFramingInSection(content, '## Confirmed Map Layout (Authoritative)');
    expectFramingInSection(content, '## Uploaded Module Reference');
    expectFramingInSection(content, '## Previously in this Campaign');
    expectFramingInSection(content, '## Established NPCs in this scene');
  });

  it("rules-arbiter.ts frames every injected content block as untrusted", () => {
    const content = readSource('lib/mcp/agents/rules-arbiter.ts');
    expectFramingInSection(content, "## This Campaign's Rules Overrides");
    expectFramingInSection(content, '## Retrieved Rules Context');
  });

  it('lore-keeper.ts frames every injected content block as untrusted', () => {
    const content = readSource('lib/mcp/agents/lore-keeper.ts');
    expectFramingInSection(content, '## Campaign Notes');
    expectFramingInSection(content, '## Recent Session Transcripts');
  });

  it('generate-summary.ts contains prompt-injection framing language', () => {
    // No "## Heading" structure here — a single system-prompt instruction
    // line, already verified directly.
    const content = readSource('lib/sessions/generate-summary.ts');
    expect(content).toMatch(FRAMING_KEYWORDS);
  });
});
