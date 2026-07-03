// lib/types/npc.ts

export type NpcDisposition =
  | 'friendly'
  | 'helpful'
  | 'neutral'
  | 'wary'
  | 'hostile';

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
