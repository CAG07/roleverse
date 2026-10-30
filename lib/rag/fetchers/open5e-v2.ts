// lib/rag/fetchers/open5e-v2.ts
// Fetches D&D 5E 2024 content (System Reference Document 5.2) from the Open5e v2
// API. The 2014 SRD stays on the v1 API (./open5e.ts) — v1 has no 2024 content,
// and v2's record shapes are different enough that sharing one fetcher would
// mean a per-version branch in every formatter.
//
// Source: https://api.open5e.com/v2/ filtered with document__key__in=srd-2024.
// Use the `__in` form: plain `document__key=` does not filter every endpoint.
//
// Scope: spells, monsters (build-encounter.ts selects from them), and the SRD's
// core rules sections as a small rules fallback. Full rules text comes from
// rulebooks players upload to their own campaigns, which take priority. The
// 2024 conditions aren't in Open5e's srd-2024 document, so ingest.ts adds them
// from data/dnd5e2024-conditions.md.
//
// License: SRD 5.2 is released by Wizards of the Coast under CC-BY-4.0, which
// requires attribution — carried on every chunk via metadata.attribution.

import type { RagChunk } from '../types';
import { fetchWithRetry } from './utils';

const BASE_URL = 'https://api.open5e.com/v2';
const DOCUMENT_KEY = 'srd-2024';
const PAGE_SIZE = 100;

export const SRD_52_ATTRIBUTION =
  'This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of ' +
  'the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the ' +
  'Creative Commons Attribution 4.0 International License, available at ' +
  'https://creativecommons.org/licenses/by/4.0/legalcode.';

/** Progress callback invoked after each record is processed */
export type ProgressCallback = (fetched: number, total: number | null) => void;

type Rec = Record<string, unknown>;

interface V2Endpoint {
  path: string;
  category: string;
  format: (item: Rec) => string;
}

const ENDPOINTS: V2Endpoint[] = [
  { path: 'rules', category: 'rule', format: formatRule },
  { path: 'spells', category: 'spell', format: formatSpell },
  { path: 'creatures', category: 'monster', format: formatCreature },
];

/**
 * Yield one RagChunk per SRD 5.2 record. Long records (big monsters) are split
 * further by ingest.ts's chunker, so each formatter puts the most identifying
 * lines first.
 */
export async function* fetchOpen5eV2Chunks(onProgress?: ProgressCallback): AsyncGenerator<RagChunk> {
  let fetched = 0;
  for (const endpoint of ENDPOINTS) {
    let url: string | null = `${BASE_URL}/${endpoint.path}/?document__key__in=${DOCUMENT_KEY}&limit=${PAGE_SIZE}`;
    while (url) {
      const response = await fetchWithRetry(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        throw new Error(`Open5e v2 fetch failed for ${endpoint.path}: ${response.status} ${response.statusText}`);
      }
      const page = (await response.json()) as { count?: number; next?: string | null; results?: Rec[] };

      for (const item of page.results ?? []) {
        const title = fixMojibake(text(item.name));
        const content = fixMojibake(endpoint.format(item)).trim();
        if (!title || content.length < 20) continue;

        yield {
          content,
          metadata: {
            gameSystem: '5E_2024',
            source: 'open5e-v2',
            category: endpoint.category,
            title,
            sourceUrl: `${BASE_URL}/${endpoint.path}/${text(item.key)}/`,
            attribution: SRD_52_ATTRIBUTION,
          },
        };
        fetched++;
        onProgress?.(fetched, null);
      }

      url = page.next ?? null;
    }
  }
}

// ---------------------------------------------------------------------------
// Formatters — one readable text block per record
// ---------------------------------------------------------------------------

function formatRule(r: Rec): string {
  return [`## ${text(r.name)}`, text(r.desc)].join('\n\n');
}

function formatSpell(r: Rec): string {
  const level = Number(r.level ?? 0);
  const school = text((r.school as Rec | null)?.name);
  const components = [r.verbal && 'V', r.somatic && 'S', r.material && 'M'].filter(Boolean).join(', ');
  const material = text(r.material_specified);
  return [
    `## ${text(r.name)}`,
    level === 0 ? `${school} Cantrip` : `Level ${level} ${school}${r.ritual ? ' (Ritual)' : ''}`,
    line('Casting Time', r.casting_time),
    line('Range', r.range_text),
    line('Components', components + (material ? ` (${material})` : '')),
    line('Duration', `${r.concentration ? 'Concentration, ' : ''}${text(r.duration)}`),
    line('Classes', names(r.classes)),
    text(r.desc),
    r.higher_level ? `**Using a Higher-Level Spell Slot.** ${text(r.higher_level)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function formatCreature(r: Rec): string {
  const scores = (r.ability_scores ?? {}) as Record<string, number>;
  const mods = (r.modifiers ?? {}) as Record<string, number>;
  const abilityLine = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
    .filter((a) => scores[a] != null)
    .map((a) => `${a.slice(0, 3).toUpperCase()} ${scores[a]} (${signed(mods[a] ?? 0)})`)
    .join(', ');
  const ri = (r.resistances_and_immunities ?? {}) as Rec;
  const hp = r.hit_dice ? `${text(r.hit_points)} (${text(r.hit_dice)})` : text(r.hit_points);

  // "Challenge X (N XP)", "Armor Class", and "Hit Points" must stay in this exact
  // wording near the top: lib/mcp/tools/build-encounter.ts#extractMonsterData
  // regex-parses them out of retrieved chunk text to build encounter budgets.
  const header = [
    `## ${text(r.name)}`,
    `${text((r.size as Rec | null)?.name)} ${text((r.type as Rec | null)?.name)}, ${text(r.alignment)}`,
    `Armor Class ${text(r.armor_class)}${r.armor_detail ? ` (${text(r.armor_detail)})` : ''}`,
    `Hit Points ${hp}`,
    line('Speed', formatSpeed(r.speed as Rec | null)),
    `Challenge ${formatChallenge(r.challenge_rating)} (${Number(r.experience_points ?? 0).toLocaleString('en-US')} XP)`,
    line('Initiative', r.initiative_bonus != null ? signed(Number(r.initiative_bonus)) : ''),
    abilityLine,
    line('Saving Throws', bonusList(r.saving_throws)),
    line('Skills', bonusList(r.skill_bonuses)),
    line('Damage Vulnerabilities', ri.damage_vulnerabilities_display),
    line('Damage Resistances', ri.damage_resistances_display),
    line('Damage Immunities', ri.damage_immunities_display),
    line('Condition Immunities', ri.condition_immunities_display),
    line('Senses', formatSenses(r)),
    line('Languages', (r.languages as Rec | null)?.as_string),
  ].filter(Boolean);

  const body: string[] = [];
  const traits = list(r.traits);
  if (traits.length) body.push('### Traits', ...traits.map((t) => `**${text(t.name)}.** ${text(t.desc)}`));

  const byType = new Map<string, Rec[]>();
  for (const a of list(r.actions)) {
    const type = text(a.action_type) || 'ACTION';
    byType.set(type, [...(byType.get(type) ?? []), a]);
  }
  for (const [type, actions] of byType) {
    body.push(`### ${actionHeading(type)}`, ...actions.map((a) => `**${text(a.name)}.** ${text(a.desc)}`));
  }

  return [header.join('\n'), ...body].join('\n\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function text(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function line(label: string, v: unknown): string {
  const s = text(v);
  return s ? `**${label}:** ${s}` : '';
}

function list(v: unknown): Rec[] {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as Rec[]) : [];
}

function names(v: unknown): string {
  return list(v)
    .map((x) => text(x.name))
    .filter(Boolean)
    .join(', ');
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function bonusList(v: unknown): string {
  if (!v || typeof v !== 'object') return '';
  return Object.entries(v as Record<string, number>)
    .map(([k, n]) => `${k.split('_').map(capitalize).join(' ')} ${signed(n)}`)
    .join(', ');
}

/** v2 returns CR as a decimal (0.25); stat blocks and build-encounter expect 1/4. */
export function formatChallenge(cr: unknown): string {
  const n = Number(cr ?? 0);
  if (n === 0.125) return '1/8';
  if (n === 0.25) return '1/4';
  if (n === 0.5) return '1/2';
  return String(Math.round(n));
}

function formatSpeed(speed: Rec | null): string {
  if (!speed) return '';
  const unit = text(speed.unit) === 'feet' ? 'ft.' : text(speed.unit);
  return Object.entries(speed)
    .filter(([k, v]) => k !== 'unit' && typeof v === 'number' && v > 0)
    .map(([k, v]) => (k === 'walk' ? `${v} ${unit}` : `${capitalize(k)} ${v} ${unit}`))
    .join(', ');
}

function formatSenses(r: Rec): string {
  const senses = (['blindsight', 'darkvision', 'tremorsense', 'truesight'] as const)
    .filter((s) => Number(r[`${s}_range`] ?? 0) > 0)
    .map((s) => `${capitalize(s)} ${text(r[`${s}_range`])} ft.`);
  if (r.passive_perception != null) senses.push(`Passive Perception ${text(r.passive_perception)}`);
  return senses.join(', ');
}

function actionHeading(type: string): string {
  switch (type) {
    case 'BONUS_ACTION':
      return 'Bonus Actions';
    case 'REACTION':
      return 'Reactions';
    case 'LEGENDARY_ACTION':
      return 'Legendary Actions';
    default:
      return 'Actions';
  }
}

// Windows-1252 code points for bytes 0x80-0x9F (the range where it differs from Latin-1).
const CP1252_HIGH: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86,
  0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95,
  0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

const MOJIBAKE_RUN = /[Â-ô][\u0080-¿ŒœŠšŸŽžƒˆ˜–-™]{1,3}/g;

/**
 * Some Open5e text was double-encoded (UTF-8 bytes read as Windows-1252), so an
 * en dash shows up as "â€“". Re-encode each suspicious run back to bytes and
 * keep the result only if it decodes as valid UTF-8.
 */
export function fixMojibake(s: string): string {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  return s.replace(MOJIBAKE_RUN, (run) => {
    const bytes: number[] = [];
    for (const ch of run) {
      const cp = ch.codePointAt(0)!;
      const b = cp <= 0xff ? cp : CP1252_HIGH[cp];
      if (b === undefined) return run;
      bytes.push(b);
    }
    try {
      return decoder.decode(new Uint8Array(bytes));
    } catch {
      return run;
    }
  });
}
