// lib/types/npc.ts

export type NpcDisposition =
  | 'friendly'
  | 'helpful'
  | 'neutral'
  | 'wary'
  | 'hostile';

/**
 * Provenance of an NPC record.
 * - manual: created via CRUD, or confirmed from a flagNpc suggestion during play.
 * - extracted: legacy value from the removed session-end transcript extraction;
 *   no longer written, but old rows may still carry it.
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

/**
 * An NPC the Game Master flagged mid-session via the flagNpc tool, awaiting
 * the player's choice to add it to the roster or dismiss it. Never written
 * to the database on its own — only on explicit player confirmation.
 */
export interface FlaggedNpc {
  name: string;
  race?: string;
  occupation?: string;
  description?: string;
  personality?: string;
  disposition?: NpcDisposition;
  current_location?: string;
  known_fact?: string;
}
