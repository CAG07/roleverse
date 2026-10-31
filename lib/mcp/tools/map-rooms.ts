// lib/mcp/tools/map-rooms.ts
// Exact lookups over an uploaded module's map data (written at upload time by
// lib/rag/index-map-pages.ts) and the party's saved position on it
// (campaigns.current_map_position). Vector search can't tell "Room 19" from
// "Room 18", or level 1's Room 19 from level 2's, so mapped rooms are looked
// up here by map label and room key instead.

import { createClient } from '@/lib/supabase/server';

export interface CampaignMap {
  mapLabel: string;
  roomKeys: string[];
  fileName: string;
  pageNumber: number;
}

export interface MapRoomRecord {
  mapLabel: string;
  roomKey: string;
  fileName: string;
  pageNumber: number;
  content: string;
  connectsTo: string[];
}

export interface MapPosition {
  mapLabel: string;
  roomKey: string;
  fileName: string;
  pageNumber: number;
  updatedAt: string;
}

interface MapRow {
  content: string;
  metadata: Record<string, unknown>;
}

/** "Room 19", "19.", " 19? " → "19"; letters compare case-insensitively. */
export function normalizeRoomKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/^(room|area)\s+/, '')
    .replace(/[.?]+$/, '')
    .trim();
}

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Abbreviation printed in parentheses, e.g. "Entrance Level (EL)" → "el". */
function labelAbbreviation(label: string): string | null {
  const match = label.match(/\(([A-Za-z0-9]{1,6})\)/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Picks the map a label the Game Master wrote refers to: exact match first,
 * then the printed abbreviation ("EL"), then a label that contains the other
 * ("entrance level" ⊂ "entrance level el"). Null when none or several match.
 */
export function matchMapLabel(requested: string, mapLabels: string[]): string | null {
  const wanted = normalizeLabel(requested);
  if (!wanted) return null;

  const exact = mapLabels.filter((l) => normalizeLabel(l) === wanted);
  if (exact.length === 1) return exact[0];

  const byAbbreviation = mapLabels.filter((l) => labelAbbreviation(l) === wanted);
  if (byAbbreviation.length === 1) return byAbbreviation[0];

  const partial = mapLabels.filter((l) => {
    const normalized = normalizeLabel(l);
    return normalized.includes(wanted) || wanted.includes(normalized);
  });
  return partial.length === 1 ? partial[0] : null;
}

function toCampaignMap(row: MapRow): CampaignMap | null {
  const m = row.metadata;
  if (typeof m.mapLabel !== 'string' || typeof m.title !== 'string') return null;
  return {
    mapLabel: m.mapLabel,
    roomKeys: Array.isArray(m.roomKeys) ? m.roomKeys.map(String) : [],
    fileName: m.title,
    pageNumber: Number(m.pageNumber),
  };
}

function toRoomRecord(row: MapRow): MapRoomRecord | null {
  const m = row.metadata;
  if (typeof m.mapLabel !== 'string' || typeof m.roomKey !== 'string' || typeof m.title !== 'string') {
    return null;
  }
  return {
    mapLabel: m.mapLabel,
    roomKey: m.roomKey,
    fileName: m.title,
    pageNumber: Number(m.pageNumber),
    content: row.content,
    connectsTo: Array.isArray(m.connectsTo) ? m.connectsTo.map(String) : [],
  };
}

/** Every map read from this campaign's uploads (one entry per map, not per page). */
export async function listCampaignMaps(campaignId: string): Promise<CampaignMap[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('campaign_embeddings')
    .select('content, metadata')
    .eq('campaign_id', campaignId)
    .eq('source_type', 'user_pdf')
    .eq('metadata->>category', 'map_layout')
    .eq('metadata->>mapOverview', 'true');
  if (error || !data) return [];
  return (data as MapRow[])
    .map(toCampaignMap)
    .filter((m): m is CampaignMap => m !== null)
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

async function fetchRoomsOnMap(campaignId: string, map: Pick<CampaignMap, 'mapLabel' | 'fileName' | 'pageNumber'>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('campaign_embeddings')
    .select('content, metadata')
    .eq('campaign_id', campaignId)
    .eq('source_type', 'user_pdf')
    .eq('metadata->>category', 'map_layout')
    .eq('metadata->>title', map.fileName)
    .eq('metadata->>pageNumber', String(map.pageNumber))
    .eq('metadata->>mapLabel', map.mapLabel);
  if (error || !data) return [];
  return (data as MapRow[]).map(toRoomRecord).filter((r): r is MapRoomRecord => r !== null);
}

/**
 * One room plus the rooms it connects to on the same map. Null when the map
 * label is unknown/ambiguous or the room isn't on that map.
 */
export async function findMapRoom(
  campaignId: string,
  requestedMap: string,
  requestedRoom: string,
  maps?: CampaignMap[]
): Promise<{ room: MapRoomRecord; neighbors: MapRoomRecord[] } | null> {
  const known = maps ?? (await listCampaignMaps(campaignId));
  const label = matchMapLabel(requestedMap, known.map((m) => m.mapLabel));
  const map = label ? known.find((m) => m.mapLabel === label) : undefined;
  if (!map) return null;

  const rooms = await fetchRoomsOnMap(campaignId, map);
  const key = normalizeRoomKey(requestedRoom);
  const room = rooms.find((r) => normalizeRoomKey(r.roomKey) === key);
  if (!room) return null;

  const neighborKeys = new Set(room.connectsTo.map(normalizeRoomKey));
  const neighbors = rooms.filter((r) => r !== room && neighborKeys.has(normalizeRoomKey(r.roomKey)));
  return { room, neighbors };
}

export async function getMapPosition(campaignId: string): Promise<MapPosition | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('campaigns')
    .select('current_map_position')
    .eq('id', campaignId)
    .maybeSingle();
  const value = data?.current_map_position as MapPosition | null | undefined;
  return value && typeof value.mapLabel === 'string' && typeof value.roomKey === 'string' ? value : null;
}

export async function saveMapPosition(campaignId: string, room: MapRoomRecord): Promise<void> {
  const supabase = await createClient();
  const position: MapPosition = {
    mapLabel: room.mapLabel,
    roomKey: room.roomKey,
    fileName: room.fileName,
    pageNumber: room.pageNumber,
    updatedAt: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('campaigns')
    .update({ current_map_position: position })
    .eq('id', campaignId);
  if (error) console.warn('[map-rooms] Failed to save the party position:', error.message);
}

/** "Known maps" prompt lines: each map's label and its room keys. */
export function formatKnownMaps(maps: CampaignMap[]): string {
  return maps.map((m) => `- ${m.mapLabel}: rooms ${m.roomKeys.join(', ')}`).join('\n');
}

/** The party's current room and the rooms it connects to, for the prompt. */
export function formatPosition(room: MapRoomRecord, neighbors: MapRoomRecord[]): string {
  const lines = [`The party is in Room ${room.roomKey} on ${room.mapLabel}.`, '', room.content];
  if (neighbors.length > 0) {
    lines.push('', 'Connected rooms on the same map:', '', neighbors.map((n) => n.content).join('\n\n'));
  }
  return lines.join('\n');
}

/**
 * Everything the Game Master needs about maps for one turn: the list of known
 * maps and, if one is saved, the party's current room with its neighbours.
 * Both strings are empty for a campaign with no maps.
 */
export async function fetchMapContext(
  campaignId: string
): Promise<{ knownMaps: string; currentPosition: string }> {
  try {
    const maps = await listCampaignMaps(campaignId);
    if (maps.length === 0) return { knownMaps: '', currentPosition: '' };

    const position = await getMapPosition(campaignId);
    const found = position ? await findMapRoom(campaignId, position.mapLabel, position.roomKey, maps) : null;
    return {
      knownMaps: formatKnownMaps(maps),
      currentPosition: found ? formatPosition(found.room, found.neighbors) : '',
    };
  } catch (err) {
    console.warn('[map-rooms] Failed to load map context:', err);
    return { knownMaps: '', currentPosition: '' };
  }
}
