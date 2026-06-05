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

/** A proposed change from an agent awaiting player confirmation */
export interface NpcProposal {
  kind: 'new_npc' | 'append_facts' | 'disposition_shift';
  npc_id?: string;           // Required for append_facts and disposition_shift
  npc_name?: string;         // Required for new_npc
  npc_data?: Partial<NpcInput>; // For new_npc: the proposed NPC fields
  facts_to_add?: NpcKnownFact[]; // For append_facts
  disposition_change?: {     // For disposition_shift
    from: NpcDisposition;
    to: NpcDisposition;
    reason: string;
    roll_required?: {
      stat: string;           // e.g., "Charisma"
      dc: number;
      outcome_on_success: NpcDisposition;
      outcome_on_failure: NpcDisposition;
    };
  };
}
