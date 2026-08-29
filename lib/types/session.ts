// lib/types/session.ts
// Shared types for the session UI components

import type { FlaggedNpc } from './npc';

/**
 * Loose shape of a transcript entry as stored in sessions.transcript JSONB.
 * Fields are optional because older rows may be missing some of them.
 */
export interface TranscriptEntry {
  role?: string;
  content?: string;
  agentType?: string;
  timestamp?: string;
}

export type SceneMediaSource = 'campaign_asset' | 'ai_generated' | 'module_reference';

export interface SceneMedia {
  id: string;
  type: 'image' | 'youtube';
  url?: string; // used when type === 'image'
  videoId?: string; // YouTube video ID, used when type === 'youtube'
  caption?: string;
  source: SceneMediaSource;
  generatedBy?: string; // agent slug if AI-generated
  campaignAssetId?: string; // reference if from uploads
  timestamp: Date;
}

/** A GM-proposed HP change the player must confirm before it's applied — never
 *  written automatically. See lib/mcp/agents/game-master.ts's flagHpChange tool. */
export interface FlaggedHpChange {
  characterId: string;
  characterName: string;
  delta: number;
  newHp: number;
  reason?: string;
}

export type MessageSource = 'typed' | 'discord_voice';

export type AgentType =
  | 'game_master'
  | 'rules_arbiter'
  | 'lore_keeper';

export interface ChatMessage {
  id: string;
  role: 'agent' | 'player' | 'system' | 'oracle';
  agentType?: AgentType;
  playerName?: string;
  content: string;
  source?: MessageSource; // how the message was input
  sceneMedia?: SceneMedia; // attached media if agent sent one
  flaggedNpcs?: FlaggedNpc[]; // NPCs the Game Master flagged for the player to confirm
  flaggedHpChanges?: (FlaggedHpChange & { key: string })[]; // HP changes the player must confirm
  timestamp: Date;
}

/** A member of a campaign (from campaign_members joined with profiles) */
export interface PartyMember {
  id: string;
  user_id: string;
  campaign_id: string;
  role: 'dm' | 'player';
  joined_at: string;
  display_name?: string | null;
}

/** A character belonging to a campaign */
export interface Character {
  id: string;
  user_id: string;
  campaign_id: string;
  name: string;
  game_system: string;
  level?: number | null;
  class?: string | null;
  race?: string | null;
  hp?: number | null;
  max_hp?: number | null;
  notes?: string | null;
  game_data_stats?: Record<string, unknown>;
  game_data_combat?: Record<string, unknown>;
  game_data_saves?: Record<string, unknown>;
  game_data_skills?: Record<string, unknown>;
  game_data_abilities?: unknown[];
  game_data_custom?: unknown[];
  equipment?: unknown[];
  spells?: Record<string, unknown> | unknown[];
  created_at: string;
}
