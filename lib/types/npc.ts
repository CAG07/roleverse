// lib/types/npc.ts

export type NpcDisposition =
  | 'friendly'
  | 'helpful'
  | 'neutral'
  | 'wary'
  | 'hostile';

/**
 * Provenance of an NPC record — determines whether extraction is allowed to
 * overwrite core fields (see lib/sessions/extract-npcs.ts upsert rules).
 * - manual: created via CRUD, protected from extraction overwrites.
 * - extracted: written by transcript extraction, refreshed on every run.
 * - imported: written by lib/npcs/import-npcs.ts, protected like manual.
 */
export type NpcSource = 'manual' | 'extracted' | 'imported';

export interface NpcKnownFact {
  fact: string;
  learned_in_session: string | null;
  learned_at: string;
}

export interface Npc {
  id: string;
  campaign_id: string;
  owner_id: string;
  name: string;
  race: string | null;
  occupation: string | null;
  description: string | null;
  personality: string | null;
  voice_notes: string | null;
  disposition: NpcDisposition;
  current_location: string | null;
  known_facts: NpcKnownFact[];
  source: NpcSource;
  last_extracted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Payload accepted by create/update API routes */
export interface NpcInput {
  name: string;
  race?: string | null;
  occupation?: string | null;
  description?: string | null;
  personality?: string | null;
  voice_notes?: string | null;
  disposition?: NpcDisposition;
  current_location?: string | null;
  known_facts?: NpcKnownFact[];
}
