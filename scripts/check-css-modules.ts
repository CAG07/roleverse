// scripts/check-css-modules.ts
// CI check: every component/page .tsx has a sibling .module.css, and none use
// inline style={{ }} or <style jsx>. Run via `npm run check:css-modules`.
//
// Uses a checked-in baseline (css-modules-baseline.json) rather than a hard
// gate: the current tree already has ~55 pre-existing deviations (Tailwind/cva
// primitives in components/ui/, thin wrapper components that delegate all
// rendering to a single styled child, a couple of genuinely dynamic inline
// styles). Retroactively restyling all of those is out of scope here — this
// check's job is to stop the count from growing, not to silently ignore it.
// Baseline entries are exact (file, reason) pairs; anything NOT in the
// baseline is a new violation and fails the check. If you deliberately fix a
// baseline entry, remove it from the JSON in the same PR — the check reports
// (but doesn't fail on) entries that no longer reproduce.
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCAN_DIRS = ['app', 'components'];
const BASELINE_PATH = path.join(import.meta.dirname, 'css-modules-baseline.json');

interface Failure {
  file: string;
  reason: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith('.tsx') && !entry.endsWith('.test.tsx')) {
      out.push(full);
    }
  }
  return out;
}

function findFailures(): Failure[] {
  const failures: Failure[] = [];

  for (const dir of SCAN_DIRS) {
    const absDir = path.join(ROOT, dir);
    if (!existsSync(absDir)) continue;

    for (const file of walk(absDir)) {
      const relPath = path.relative(ROOT, file).replace(/\\/g, '/');

      const moduleCssPath = file.replace(/\.tsx$/, '.module.css');
      if (!existsSync(moduleCssPath)) {
        failures.push({ file: relPath, reason: 'missing sibling .module.css' });
      }

      const content = readFileSync(file, 'utf-8');
      if (/style=\{\{/.test(content)) {
        failures.push({ file: relPath, reason: 'uses inline style={{ }}' });
      }
      if (/<style jsx/.test(content)) {
        failures.push({ file: relPath, reason: 'uses <style jsx>' });
      }
    }
  }

  return failures;
}

function main() {
  const failures = findFailures();
  const baseline: Failure[] = existsSync(BASELINE_PATH)
    ? JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'))
    : [];
  const baselineKeys = new Set(baseline.map((f) => `${f.file}|${f.reason}`));
  const failureKeys = new Set(failures.map((f) => `${f.file}|${f.reason}`));

  const newViolations = failures.filter((f) => !baselineKeys.has(`${f.file}|${f.reason}`));
  const fixed = baseline.filter((f) => !failureKeys.has(`${f.file}|${f.reason}`));

  if (fixed.length > 0) {
    console.log(
      `check:css-modules — ${fixed.length} baseline entr${fixed.length === 1 ? 'y' : 'ies'} no longer reproduce(s) — remove from scripts/css-modules-baseline.json:`
    );
    for (const { file, reason } of fixed) console.log(`  ${file} — ${reason}`);
  }

  if (newViolations.length === 0) {
    console.log('check:css-modules — no new CSS Modules convention violations.');
    return;
  }

  console.error(`check:css-modules — ${newViolations.length} new violation(s):\n`);
  for (const { file, reason } of newViolations) {
    console.error(`  ${file} — ${reason}`);
  }
  process.exit(1);
}

main();
