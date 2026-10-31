// lib/rag/map-vision.ts
// Upload-time vision calls that find a module's map pages and read each map
// into structured, retrievable text — including labels baked into the map
// image itself, which is the only place some of that information exists.
//
// Two steps:
// 1. classifyMapPages — every page goes in as a small thumbnail (20 per call,
//    Haiku) and Claude says which pages hold maps. Cheap, and finds a map
//    wherever it sits in the PDF and however much text surrounds it.
// 2. transcribeMapPage — one call per map page with the full page plus four
//    zoomed tiles, using the vision model. A page can hold more than one map
//    (Palace of the Silver Princess prints the Upper Level and the Guard Tower
//    Level side by side, both numbering rooms from 1), so each map on the page
//    comes back separately and room numbers are never merged across maps.
//
// Runs once per upload, never per turn. The Game Master treats the result as
// authoritative (see the "Confirmed Map Layout" prompt block in
// lib/mcp/agents/game-master.ts), so reading uses the vision model rather
// than Haiku despite the higher per-call cost.

import Anthropic from '@anthropic-ai/sdk';
import type { MapPageImages, PageImage } from './pdf-pages';

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
}

function getClient(): Anthropic {
  return new Anthropic({ apiKey: getRequiredEnv('ANTHROPIC_API_KEY') });
}

const CLASSIFY_BATCH_SIZE = 20;
const CLASSIFY_ATTEMPTS = 2;
const CLASSIFY_MAX_TOKENS = 2000;

/** Large enough for a 60-room level with exits; the old 1,024 cap cut off any
 * map past roughly 15 rooms, and a cut-off answer can't be parsed at all. */
const TRANSCRIBE_MAX_TOKENS = 16000;

const CLASSIFY_PROMPT = `These are thumbnails of pages from a tabletop RPG module PDF, each preceded by its page number. For each page, decide whether it contains a map or floorplan of a dungeon, building, or area with keyed locations (numbered or lettered rooms or areas). Cover art, character or monster illustrations, decorative pages, and text-only pages are not maps, even if they show a small decorative sketch.

Respond with ONLY a JSON array (no markdown fences, no commentary), one entry per page shown:
[{"page": number, "is_map": boolean}]`;

const TRANSCRIBE_PROMPT = `The images above are one page from a tabletop RPG module PDF: the full page, then four zoomed, overlapping tiles of the same page for reading small numbers and symbols. A page may hold MORE THAN ONE map (for example two dungeon levels side by side). Treat each map separately: room numbers often repeat between maps and must never be mixed.

Use the map's printed legend, if there is one, to identify doors, secret doors, stairs, trap doors, portcullises and similar symbols.

Respond with ONLY one JSON object (no markdown fences, no commentary) matching exactly this shape:

{
  "maps": [
    {
      "map_label": string,                 // the map's printed title, e.g. "Entrance Level (EL)"; describe it briefly if untitled
      "rooms": [
        {
          "key": string,                   // the room's number or letter exactly as printed
          "position": { "x": number, "y": number }, // where the room's number sits on the FULL page: x from 0 (left edge) to 1 (right edge), y from 0 (top edge) to 1 (bottom edge)
          "notes": string,                 // one short sentence: shape, size, and features visible on the map (statues, pools, pillars)
          "exits": [
            {
              "to": string,                // an adjacent room key on THIS map, or "corridor" / "outside"
              "via": string,               // one of: open, door, double door, secret door, false door, portcullis, archway, curtain, stairs up, stairs down, trap door, other
              "direction": string | null,  // compass direction from this room, e.g. "north", "southeast"
              "to_level": string | null    // only when this exit leads to ANOTHER map, e.g. "Upper Level (UL)"
            }
          ]
        }
      ],
      "level_connections": string[],       // markers linking to other maps, e.g. "UL marker beside room 33 leads to the Upper Level"
      "other_visible_text": string[]       // legend entries, scale, compass and other notes printed on this map
    }
  ]
}

Rules:
- Include every numbered or lettered location you can see, even if you are unsure of its exits.
- Check every wall of every room for a door or opening, including the wall a corridor runs along; a missed door makes the room unreachable in play.
- Only list an exit you can actually see on the map. When a room opens onto an unnumbered corridor, use "corridor" and name in its notes which rooms that corridor reaches, if visible.
- Give every room a position, measured on the full page image (not a tile), even if approximate.
- Do not guess. If a number is hard to read, give your best reading followed by "?" (for example "2?").
- If the page holds no map, respond {"maps": []}.`;

export interface MapExit {
  to: string;
  via: string;
  direction: string | null;
  toLevel: string | null;
}

export interface MapRoom {
  key: string;
  notes: string;
  exits: MapExit[];
  /** Where the room sits on the page (0-1 from the top-left corner); null if not given. */
  position: { x: number; y: number } | null;
}

function asPosition(value: unknown): MapRoom['position'] {
  if (typeof value !== 'object' || value === null) return null;
  const { x, y } = value as Record<string, unknown>;
  const nx = Number(x);
  const ny = Number(y);
  if (!Number.isFinite(nx) || !Number.isFinite(ny) || nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;
  return { x: nx, y: ny };
}

export interface MapTranscription {
  pageNumber: number;
  mapLabel: string;
  rooms: MapRoom[];
  levelConnections: string[];
  otherVisibleText: string[];
}

export interface MapPageReading {
  /** Null when the reply couldn't be read (an API error, or JSON cut off at the output limit). */
  maps: MapTranscription[] | null;
  /** True when the model hit its output limit — rooms may be missing. */
  truncated: boolean;
}

/** Strips an optional ```json fence the model may add despite instructions not to. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  return null;
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(asString).filter((s): s is string => s !== null) : [];
}

function textOf(response: Anthropic.Messages.Message): string {
  return response.content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

function imageBlock(pngBase64: string): Anthropic.Messages.ImageBlockParam {
  return { type: 'image', source: { type: 'base64', media_type: 'image/png', data: pngBase64 } };
}

/** Parses the classification reply into the page numbers Claude marked as maps. */
export function parseMapPageClassification(text: string): number[] {
  const parsed: unknown = JSON.parse(stripCodeFence(text));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((entry): entry is { page: number; is_map: boolean } =>
      typeof entry === 'object' && entry !== null && (entry as { is_map?: unknown }).is_map === true
    )
    .map((entry) => Number(entry.page))
    .filter((page) => Number.isInteger(page) && page > 0);
}

/**
 * Returns the page numbers that hold maps, in page order. A batch that fails
 * is retried once; if it fails again the whole scan fails, so a partial scan
 * is never reported as complete (and the caller keeps the existing map data).
 */
export async function classifyMapPages(thumbnails: PageImage[]): Promise<number[]> {
  const model = getRequiredEnv('ANTHROPIC_HAIKU_MODEL');
  const client = getClient();
  const mapPages = new Set<number>();

  for (let i = 0; i < thumbnails.length; i += CLASSIFY_BATCH_SIZE) {
    const batch = thumbnails.slice(i, i + CLASSIFY_BATCH_SIZE);
    const content: Anthropic.Messages.ContentBlockParam[] = batch.flatMap((t) => [
      { type: 'text' as const, text: `Page ${t.pageNumber}:` },
      imageBlock(t.pngBase64),
    ]);
    content.push({ type: 'text', text: CLASSIFY_PROMPT });

    const batchPages = new Set(batch.map((t) => t.pageNumber));
    let lastError: unknown;
    let classified = false;
    for (let attempt = 1; attempt <= CLASSIFY_ATTEMPTS && !classified; attempt++) {
      try {
        const response = await client.messages.create({
          model,
          max_tokens: CLASSIFY_MAX_TOKENS,
          messages: [{ role: 'user', content }],
        });
        for (const page of parseMapPageClassification(textOf(response))) {
          if (batchPages.has(page)) mapPages.add(page);
        }
        classified = true;
      } catch (err) {
        lastError = err;
      }
    }
    if (!classified) {
      const first = batch[0].pageNumber;
      const last = batch[batch.length - 1].pageNumber;
      console.warn(`[map-vision] Failed to classify pages ${first}-${last}:`, lastError);
      throw new Error(`Could not check pages ${first} to ${last} for maps. Try Re-scan maps.`);
    }
  }

  return [...mapPages].sort((a, b) => a - b);
}

/** Parses and normalises the transcription reply; throws on unparseable JSON. */
export function parseMapTranscription(text: string, pageNumber: number): MapTranscription[] {
  const parsed = JSON.parse(stripCodeFence(text)) as { maps?: unknown };
  if (!Array.isArray(parsed.maps)) return [];

  return parsed.maps.flatMap((rawMap, index): MapTranscription[] => {
    if (typeof rawMap !== 'object' || rawMap === null) return [];
    const map = rawMap as Record<string, unknown>;
    const rooms = (Array.isArray(map.rooms) ? map.rooms : []).flatMap((rawRoom): MapRoom[] => {
      if (typeof rawRoom !== 'object' || rawRoom === null) return [];
      const room = rawRoom as Record<string, unknown>;
      const key = asString(room.key);
      if (!key) return [];
      const exits = (Array.isArray(room.exits) ? room.exits : []).flatMap((rawExit): MapExit[] => {
        if (typeof rawExit !== 'object' || rawExit === null) return [];
        const exit = rawExit as Record<string, unknown>;
        const to = asString(exit.to);
        if (!to) return [];
        return [
          {
            to,
            via: asString(exit.via) ?? 'open',
            direction: asString(exit.direction),
            toLevel: asString(exit.to_level),
          },
        ];
      });
      return [{ key, notes: asString(room.notes) ?? '', exits, position: asPosition(room.position) }];
    });
    if (rooms.length === 0) return [];

    return [
      {
        pageNumber,
        mapLabel: asString(map.map_label) ?? `Untitled map ${index + 1} (page ${pageNumber})`,
        rooms,
        levelConnections: asStringList(map.level_connections),
        otherVisibleText: asStringList(map.other_visible_text),
      },
    ];
  });
}

/**
 * Reads every map on one page. maps is null on an API or parse failure
 * (logged, never fatal to the rest of the upload); truncated is kept either way.
 */
export async function transcribeMapPage(images: MapPageImages): Promise<MapPageReading> {
  const { pageNumber } = images;
  try {
    const content: Anthropic.Messages.ContentBlockParam[] = [
      { type: 'text', text: 'Full page:' },
      imageBlock(images.fullPagePngBase64),
      ...images.tiles.flatMap((tile) => [
        { type: 'text' as const, text: `Zoomed tile, ${tile.position} of the same page:` },
        imageBlock(tile.pngBase64),
      ]),
      { type: 'text', text: TRANSCRIBE_PROMPT },
    ];

    const response = await getClient().messages.create({
      model: getRequiredEnv('ANTHROPIC_VISION_MODEL'),
      max_tokens: TRANSCRIBE_MAX_TOKENS,
      messages: [{ role: 'user', content }],
    });

    const truncated = response.stop_reason === 'max_tokens';
    if (truncated) {
      console.warn(`[map-vision] Map reading for page ${pageNumber} hit the output limit; rooms may be missing.`);
    }

    try {
      return { maps: parseMapTranscription(textOf(response), pageNumber), truncated };
    } catch (err) {
      // A reply cut off at the output limit usually ends mid-JSON; keep the flag
      // so the player sees why the page wasn't read.
      console.warn(`[map-vision] Could not parse the map reading for page ${pageNumber}:`, err);
      return { maps: null, truncated };
    }
  } catch (err) {
    console.warn(`[map-vision] Failed to read map page ${pageNumber}:`, err);
    return { maps: null, truncated: false };
  }
}

function formatExit(exit: MapExit): string {
  const target = exit.toLevel ? `${exit.to} on ${exit.toLevel}` : exit.to === 'corridor' || exit.to === 'outside' ? exit.to : `room ${exit.to}`;
  const direction = exit.direction ? `${exit.direction}, ` : '';
  return `${direction}${exit.via} to ${target}`;
}

/**
 * Formats one room as its own embeddable chunk. Each chunk carries its map's
 * label in its own text, not just metadata, so a room number that recurs on
 * another level stays distinguishable to both search and the model.
 */
export function formatMapRoomMarkdown(t: MapTranscription, room: MapRoom): string {
  const lines: string[] = [`## ${t.mapLabel} — Room ${room.key}`, ''];
  if (room.notes) lines.push(room.notes);
  if (room.exits.length > 0) lines.push(`Exits: ${room.exits.map(formatExit).join('; ')}`);
  return lines.join('\n').trim();
}

/**
 * Formats the map overview (label, full room index, links to other maps,
 * legend) as its own chunk, so whole-map questions ("what level are we on")
 * still have something to match against.
 */
export function formatMapOverviewMarkdown(t: MapTranscription): string {
  const lines: string[] = [`## ${t.mapLabel} — Map Overview`, ''];
  lines.push(`Rooms on this map: ${t.rooms.map((r) => r.key).join(', ')}`);

  if (t.levelConnections.length > 0) {
    lines.push('', 'Connections to other maps:');
    for (const line of t.levelConnections) lines.push(`- ${line}`);
  }

  if (t.otherVisibleText.length > 0) {
    lines.push('', 'Other text visible on the map:');
    for (const line of t.otherVisibleText) lines.push(`- ${line}`);
  }

  return lines.join('\n').trim();
}
