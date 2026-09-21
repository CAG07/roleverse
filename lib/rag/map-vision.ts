// lib/rag/map-vision.ts
// One-time, ingestion-time vision call that reads a candidate map page
// (see lib/rag/pdf-pages.ts) and transcribes it into structured, retrievable
// text — including any labels baked into the map image itself, which is the
// only place some of that information exists (e.g. an area name drawn onto
// the map with nothing naming it anywhere else in the module's text).
//
// This is the first vision usage in RoleVerse. Runs once per candidate page
// at upload time, never per turn — a wrong transcription would be worse than
// no map data at all, since the Game Master treats it as authoritative
// (see the "Confirmed Map Layout" prompt block in lib/mcp/agents/game-master.ts),
// so this defaults to Sonnet over Haiku despite the higher per-call cost.

import Anthropic from '@anthropic-ai/sdk';

function getRequiredVisionModel(): string {
  const model = process.env.ANTHROPIC_VISION_MODEL;
  if (!model) throw new Error('ANTHROPIC_VISION_MODEL environment variable is required');
  return model;
}

const MAX_TOKENS = 1024;

const CLASSIFY_AND_TRANSCRIBE_PROMPT = `This image is one page from a tabletop RPG module PDF. Determine whether it is a dungeon/area/floorplan map, and if so, transcribe its structure.

Respond with ONLY a single JSON object (no markdown fences, no commentary) matching exactly this shape:

{
  "is_map": boolean,
  "map_label": string | null,       // any title/area name printed or hand-lettered ON the map itself (e.g. "Entrance Level"); null if none is visible
  "rooms": [                        // omit or empty array if not a map
    {
      "key": string,                // the room's number or letter as marked on the map, or a short label if unmarked
      "notes": string,               // brief physical description visible from the map alone: shape, notable features
      "exits": string[]              // adjacent room keys/directions this room connects to, as shown on the map
    }
  ],
  "other_visible_text": string[]    // any other legible text on the map (legend, scale, compass, notes) not already captured above
}

If this page is NOT a map (it's a portrait, cover art, decorative border, or anything else), respond with {"is_map": false, "map_label": null, "rooms": [], "other_visible_text": []} and nothing else.`;

export interface MapTranscription {
  pageNumber: number;
  mapLabel: string | null;
  rooms: { key: string; notes: string; exits: string[] }[];
  otherVisibleText: string[];
}

interface RawVisionResponse {
  is_map: boolean;
  map_label: string | null;
  rooms?: { key: string; notes: string; exits: string[] }[];
  other_visible_text?: string[];
}

/** Strips an optional ```json fence the model may add despite instructions not to. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

/**
 * Classifies and, if the page is a real map, transcribes it in one combined
 * call — returns null for non-map pages or on any parse/API failure (logged,
 * never fatal to the enclosing ingestion run).
 */
export async function classifyAndTranscribeMapPage(
  pngBase64: string,
  pageNumber: number
): Promise<MapTranscription | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set');

  try {
    const visionModel = getRequiredVisionModel();
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: visionModel,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: pngBase64 } },
            { type: 'text', text: CLASSIFY_AND_TRANSCRIBE_PROMPT },
          ],
        },
      ],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
    );
    if (!textBlock) return null;

    const parsed = JSON.parse(stripCodeFence(textBlock.text)) as RawVisionResponse;
    if (!parsed.is_map) return null;

    return {
      pageNumber,
      mapLabel: parsed.map_label ?? null,
      rooms: parsed.rooms ?? [],
      otherVisibleText: parsed.other_visible_text ?? [],
    };
  } catch (err) {
    console.warn(`[map-vision] Failed to classify/transcribe page ${pageNumber}:`, err);
    return null;
  }
}

/**
 * Formats a single room from a transcribed map into its own embeddable chunk.
 * Each chunk carries the parent map's label/page in its own text, not just
 * metadata, so a room number that recurs on a different level (e.g. two maps
 * that both have a "Room 19") stays distinguishable both to vector search —
 * each room is now its own precisely-matchable row instead of being buried
 * inside one giant whole-page chunk — and to the model reading it.
 */
export function formatMapRoomMarkdown(
  t: MapTranscription,
  room: { key: string; notes: string; exits: string[] }
): string {
  const label = t.mapLabel ?? `Untitled map (page ${t.pageNumber})`;
  const lines: string[] = [`## ${label} — Room ${room.key}`, ''];
  if (room.notes) lines.push(room.notes);
  if (room.exits.length > 0) lines.push(`Exits/connections: ${room.exits.join(', ')}`);
  return lines.join('\n').trim();
}

/**
 * Formats the map-level overview (label, full room index, and any other
 * legend/scale/compass text) as its own chunk, separate from the per-room
 * chunks above, so whole-map questions ("what level are we on") still have
 * something to match against.
 */
export function formatMapOverviewMarkdown(t: MapTranscription): string {
  const label = t.mapLabel ?? `Untitled map (page ${t.pageNumber})`;
  const lines: string[] = [`## ${label} — Map Overview`, ''];

  if (t.rooms.length > 0) {
    lines.push(`Rooms on this map: ${t.rooms.map((r) => r.key).join(', ')}`);
  }

  if (t.otherVisibleText.length > 0) {
    lines.push('', 'Other text visible on the map:');
    for (const line of t.otherVisibleText) lines.push(`- ${line}`);
  }

  return lines.join('\n').trim();
}
