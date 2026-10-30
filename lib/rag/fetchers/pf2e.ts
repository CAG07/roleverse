// lib/rag/fetchers/pf2e.ts
// Fetches Pathfinder 2E content from the Foundry VTT pf2e system repository.
// Source: https://github.com/foundryvtt/pf2e (code Apache-2.0; game content
// carries its own per-entry license in system.publication.license).
//
// The repo keeps every compendium entry as a plain JSON file under
// packs/pf2e/<pack>/**.json. The old fetcher here looked for LevelDB/JSONL pack
// files that no longer exist (and old pack names like `feats-srd`), so it fell
// through to a one-chunk placeholder. This version downloads the repo tarball
// for one pinned commit (~110 MB, a single request instead of ~17,000 raw-file
// fetches that would hit GitHub's rate limits), streams it through `tar`, and
// keeps only the packs listed below. Only remastered entries published under the
// ORC or OGL license are ingested (about 4,000 legacy entries are skipped).

import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Parser, type ReadEntry } from 'tar';

import type { RagChunk } from '../types';
import { fetchWithRetry } from './utils';

const PF2E_REPO = 'foundryvtt/pf2e';
const COMMIT = '675d2b7d613a80572b0330364ce84659068abe66';

/**
 * Compendium packs to ingest: spells, plus conditions as a small rules fallback.
 * Full rules text comes from rulebooks players upload to their own campaigns,
 * which take priority. formatCreature and the other category mappings stay so a
 * pack can be added back here without other changes.
 */
const TARGET_PACKS = ['spells', 'conditions'] as const;

const OPEN_LICENSES = new Set(['ORC', 'OGL']);

/** Progress callback invoked after each entry is processed */
export type ProgressCallback = (fetched: number, total: number | null) => void;

type Rec = Record<string, unknown>;

interface FoundryEntry {
  name?: string;
  type?: string;
  system?: Rec;
  items?: FoundryEntry[];
}

export async function* fetchPf2eChunks(onProgress?: ProgressCallback): AsyncGenerator<RagChunk> {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetchWithRetry(
    `https://codeload.github.com/${PF2E_REPO}/tar.gz/${COMMIT}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    15 * 60_000
  );
  if (!res.ok || !res.body) {
    throw new Error(`PF2E tarball download failed: ${res.status} ${res.statusText}`);
  }

  // Collect chunks while the tarball streams; tar entries have to be consumed
  // as they arrive, so yielding happens after the stream finishes.
  const chunks: RagChunk[] = [];
  const packPattern = new RegExp(`^[^/]+/packs/pf2e/(${TARGET_PACKS.join('|')})/.+\\.json$`);

  const parser = new Parser({
    onReadEntry: (entry: ReadEntry) => {
      const match = packPattern.exec(entry.path);
      if (entry.type !== 'File' || !match || entry.path.endsWith('_folders.json')) {
        entry.resume();
        return;
      }
      const parts: Buffer[] = [];
      entry.on('data', (d: Buffer) => parts.push(d));
      entry.on('end', () => {
        try {
          const parsed = JSON.parse(Buffer.concat(parts).toString('utf-8')) as FoundryEntry;
          const chunk = entryToChunk(parsed, match[1]);
          if (chunk) chunks.push(chunk);
        } catch {
          // Malformed entry — skip it rather than failing the whole run.
        }
      });
    },
  });

  await pipeline(Readable.fromWeb(res.body as import('node:stream/web').ReadableStream), parser);

  if (chunks.length === 0) {
    throw new Error('PF2E tarball contained no ingestible entries — check the pack names and pinned commit.');
  }

  let done = 0;
  for (const chunk of chunks) {
    yield chunk;
    done++;
    onProgress?.(done, chunks.length);
  }
}

/** Convert a Foundry compendium entry to a RagChunk, or null if it should be skipped. */
export function entryToChunk(entry: FoundryEntry, packName: string): RagChunk | null {
  const name = entry.name?.trim();
  const system = entry.system ?? {};
  if (!name) return null;

  // NPC actors carry their publication info on embedded items rather than the actor.
  const publication = system.publication
    ? obj(system.publication)
    : obj((entry.items ?? []).map((i) => i.system?.publication).find(Boolean));
  const license = text(publication.license);
  if (!OPEN_LICENSES.has(license)) return null;
  // Skip legacy (pre-remaster) entries: the remaster replaced them, and indexing
  // both would give the Rules Arbiter two conflicting versions of the same rule.
  if (publication.remaster !== true) return null;

  const content = (entry.type === 'npc' ? formatCreature(entry) : formatEntry(entry)).trim();
  if (content.length < 30) return null;

  return {
    content,
    metadata: {
      gameSystem: 'PATHFINDER_2E',
      source: 'pf2e-foundry',
      category: packNameToCategory(packName),
      title: name,
      packName,
      foundryType: entry.type,
      license,
      sourceUrl: `https://github.com/${PF2E_REPO}/tree/${COMMIT}/packs/pf2e/${packName}`,
    },
  };
}

function formatEntry(entry: FoundryEntry): string {
  const s = entry.system ?? {};
  const traits = obj(s.traits);
  const level = obj(s.level).value;
  const lines = [
    `## ${entry.name}`,
    line('Type', entry.type),
    line(entry.type === 'spell' ? 'Rank' : 'Level', level),
    line('Traits', [text(traits.rarity) !== 'common' ? text(traits.rarity) : '', ...strings(traits.value)].filter(Boolean).join(', ')),
    line('Traditions', strings(traits.traditions).join(', ')),
    line('Actions', obj(s.actions).value ?? obj(s.time).value),
    line('Range', obj(s.range).value),
    line('Area', s.area ? `${text(obj(s.area).value)}-foot ${text(obj(s.area).type)}` : ''),
    line('Targets', obj(s.target).value),
    line('Defense', obj(obj(s.defense).save).statistic),
    line('Duration', formatDuration(obj(s.duration))),
    line('Prerequisites', arr(obj(s.prerequisites).value).map((p) => text(obj(p).value)).join(', ')),
    line('Hit Points', obj(s.hp).value),
    line('Price', formatPrice(obj(obj(s.price).value))),
    line('Bulk', obj(s.bulk).value),
    // A spell's level is its base rank, which resolves rank-dependent damage.
    cleanDescription(text(obj(s.description).value), entry.type === 'spell' ? Number(level) || undefined : undefined),
  ];
  return lines.filter(Boolean).join('\n');
}

function formatCreature(entry: FoundryEntry): string {
  const s = entry.system ?? {};
  const attrs = obj(s.attributes);
  const details = obj(s.details);
  const traits = obj(s.traits);
  const saves = obj(s.saves);
  const perception = obj(s.perception);
  const abilities = obj(s.abilities);

  const header = [
    `## ${entry.name}`,
    `Creature ${text(obj(details.level).value)}`,
    line('Traits', [text(traits.rarity), text(obj(traits.size).value), ...strings(traits.value)].filter(Boolean).join(', ')),
    line(
      'Perception',
      `${signed(Number(perception.mod ?? 0))}${arr(perception.senses).length ? '; ' + arr(perception.senses).map((x) => text(obj(x).type)).join(', ') : ''}`
    ),
    line('Languages', strings(obj(details.languages).value).join(', ')),
    line('Skills', Object.entries(obj(s.skills)).map(([k, v]) => `${capitalize(k)} ${signed(Number(obj(v).base ?? 0))}`).join(', ')),
    ['str', 'dex', 'con', 'int', 'wis', 'cha']
      .filter((a) => abilities[a])
      .map((a) => `${capitalize(a)} ${signed(Number(obj(abilities[a]).mod ?? 0))}`)
      .join(', '),
    `AC ${text(obj(attrs.ac).value)}; Fort ${signed(Number(obj(saves.fortitude).value ?? 0))}, Ref ${signed(Number(obj(saves.reflex).value ?? 0))}, Will ${signed(Number(obj(saves.will).value ?? 0))}`,
    `HP ${text(obj(attrs.hp).max)}${listOf(attrs.immunities, 'Immunities')}${listOf(attrs.resistances, 'Resistances')}${listOf(attrs.weaknesses, 'Weaknesses')}`,
    line('Speed', `${text(obj(attrs.speed).value)} feet${arr(obj(attrs.speed).otherSpeeds).map((o) => `, ${text(obj(o).type)} ${text(obj(o).value)} feet`).join('')}`),
  ].filter(Boolean);

  const body: string[] = [];
  for (const item of entry.items ?? []) {
    const is = item.system ?? {};
    if (item.type === 'melee') {
      const damage = Object.values(obj(is.damageRolls))
        .map((d) => `${text(obj(d).damage)} ${text(obj(d).damageType)}`)
        .join(' plus ');
      const effects = strings(obj(is.attackEffects).value);
      body.push(`**Strike: ${item.name}** ${signed(Number(obj(is.bonus).value ?? 0))}, Damage ${damage}${effects.length ? ` plus ${effects.join(', ')}` : ''}`);
    } else if (item.type === 'action') {
      const desc = cleanDescription(text(obj(is.description).value));
      if (desc) body.push(`**${item.name}** ${desc}`);
    }
  }
  const notes = cleanDescription(text(details.publicNotes));

  return [header.join('\n'), ...body, notes].filter(Boolean).join('\n\n');
}

function packNameToCategory(packName: string): string {
  if (packName === 'spells') return 'spell';
  if (packName.includes('monster')) return 'monster';
  if (packName === 'feats') return 'feat';
  if (packName === 'conditions') return 'condition';
  if (packName === 'equipment') return 'item';
  if (packName === 'actions') return 'action';
  if (packName.startsWith('class')) return 'class';
  if (packName.startsWith('ancestr') || packName === 'heritages') return 'race';
  if (packName === 'backgrounds') return 'background';
  return 'rule';
}

/**
 * Strip HTML and resolve Foundry's inline enrichers: `@UUID[...]{Label}` keeps
 * the label, `@Damage[2d6[fire]]` becomes "2d6 fire", `@Check[reflex|dc:20]`
 * becomes "DC 20 Reflex", and `@Localize[...]` (UI text keys) is dropped.
 */
export function cleanDescription(html: string, rank?: number): string {
  return replaceEnrichers(html, rank)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h\d)>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Replace each `@Name[...]` enricher (with an optional `{Label}` after it). The
 * brackets are matched by depth rather than by regex, because damage formulas
 * nest them: `@Damage[(@item.level)d4[persistent,mental]]`.
 */
function replaceEnrichers(source: string, rank?: number): string {
  let out = '';
  let i = 0;
  const start = /@(\w+)\[/g;
  let m: RegExpExecArray | null;
  while ((m = start.exec(source))) {
    const open = m.index + m[0].length;
    let depth = 1;
    let close = open;
    while (close < source.length && depth > 0) {
      if (source[close] === '[') depth++;
      else if (source[close] === ']') depth--;
      if (depth > 0) close++;
    }
    if (depth > 0) break; // unbalanced: leave the rest as-is
    const inner = source.slice(open, close);
    let end = close + 1;
    let label: string | null = null;
    if (source[end] === '{') {
      const labelEnd = source.indexOf('}', end);
      if (labelEnd !== -1) {
        label = source.slice(end + 1, labelEnd);
        end = labelEnd + 1;
      }
    }
    out += source.slice(i, m.index) + (label ?? renderEnricher(m[1], inner, rank));
    i = end;
    start.lastIndex = end;
  }
  return out + source.slice(i);
}

function renderEnricher(name: string, inner: string, rank?: number): string {
  switch (name) {
    case 'Damage':
      return resolveDamage(inner, rank);
    case 'Check': {
      const [type, ...opts] = inner.split('|');
      const dc = opts.find((o) => o.startsWith('dc:'))?.slice(3);
      return `${dc ? `DC ${dc} ` : ''}${capitalize(type.replace(/^type:/, ''))}`;
    }
    case 'UUID':
      return inner.split('.').pop() ?? '';
    case 'Localize':
      return '';
    case 'Template': {
      const opts = Object.fromEntries(inner.split('|').map((o) => o.split(':') as [string, string]));
      const type = opts.type ?? inner.split('|')[0];
      return opts.distance ? `${opts.distance}-foot ${type}` : type;
    }
    default:
      return inner.split('|')[0];
  }
}

/**
 * Turn a Foundry damage formula into readable text. Rank variables
 * (@item.level, @item.rank) resolve to the spell's rank when it's known, and
 * purely numeric arithmetic is evaluated, so `(@item.level)d4[persistent,mental]`
 * at rank 1 becomes "1d4 persistent mental". Anything that can't be resolved
 * (a creature's level, say) is kept readable rather than mangled.
 */
export function resolveDamage(formula: string, rank?: number): string {
  let f = formula.split('|')[0];
  f = f.replace(/@(item|spell)\.(level|rank)/g, rank !== undefined ? String(rank) : 'spell rank');
  f = f.replace(/@actor\.level/g, 'your level');

  // Evaluate numeric-only groups, innermost first: (1), floor(5/2), ceil((3+1)/2).
  let previous: string;
  do {
    previous = f;
    f = f.replace(/(floor|ceil)?\(([\d+\-*/. ]+)\)/g, (match, fn: string | undefined, expr: string) => {
      const value = evaluateArithmetic(expr);
      if (value === null) return match;
      const n = fn === 'floor' ? Math.floor(value) : fn === 'ceil' ? Math.ceil(value) : value;
      return String(n);
    });
  } while (f !== previous);
  f = f.replace(/floor\(([^()]*)\)/g, '($1, rounded down)').replace(/ceil\(([^()]*)\)/g, '($1, rounded up)');

  // Damage type tags: 2d6[fire] -> "2d6 fire", [persistent,mental] -> "persistent mental".
  do {
    previous = f;
    f = f.replace(/\[([A-Za-z][A-Za-z,\- ]*)\]/g, (_, types: string) => ` ${types.split(',').join(' ')}`);
  } while (f !== previous);

  return f
    .replace(/[{}]/g, '')
    .replace(/,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Evaluate +, -, *, / over plain numbers. Returns null for anything else. */
function evaluateArithmetic(expr: string): number | null {
  const tokens = expr.replace(/\s+/g, '').match(/\d+(?:\.\d+)?|[+\-*/]/g);
  if (!tokens || tokens.join('') !== expr.replace(/\s+/g, '')) return null;
  // Two passes: * and / first, then + and -.
  const terms: (number | string)[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if ((t === '*' || t === '/') && terms.length) {
      const left = terms.pop() as number;
      const right = Number(tokens[++i]);
      if (Number.isNaN(right)) return null;
      terms.push(t === '*' ? left * right : left / right);
    } else {
      terms.push(t === '+' || t === '-' ? t : Number(t));
    }
  }
  let total = typeof terms[0] === 'number' ? terms[0] : NaN;
  for (let i = 1; i < terms.length; i += 2) {
    const op = terms[i];
    const value = terms[i + 1];
    if (typeof value !== 'number') return null;
    total = op === '+' ? total + value : total - value;
  }
  return Number.isFinite(total) ? total : null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function obj(v: unknown): Rec {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {};
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function strings(v: unknown): string[] {
  return arr(v).filter((x): x is string => typeof x === 'string');
}

function text(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

function line(label: string, v: unknown): string {
  const s = text(v);
  return s ? `**${label}:** ${s}` : '';
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function listOf(v: unknown, label: string): string {
  const items = arr(v).map((x) => {
    const o = obj(x);
    return `${text(o.type)}${o.value != null ? ` ${text(o.value)}` : ''}`;
  });
  return items.length ? `; ${label} ${items.join(', ')}` : '';
}

/** "Sustained up to 1 minute" when the spell must be Sustained; the description often doesn't say. */
function formatDuration(duration: Rec): string {
  const value = text(duration.value);
  if (duration.sustained === true) return value ? `Sustained up to ${value}` : 'Sustained';
  return value;
}

function formatPrice(price: Rec): string {
  return ['pp', 'gp', 'sp', 'cp']
    .filter((c) => Number(price[c] ?? 0) > 0)
    .map((c) => `${price[c]} ${c}`)
    .join(', ');
}
