// lib/types/session.ts
// Shared types for the session UI components

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

export type SceneMediaSource = 'campaign_asset' | 'ai_generated';

export interface SceneMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
  source: SceneMediaSource;
  generatedBy?: string; // agent slug if AI-generated
  campaignAssetId?: string; // reference if from uploads
  timestamp: Date;
}

export type MessageSource = 'typed' | 'discord_voice';

export type AgentType =
  | 'game_master'
  | 'rules_arbiter'
  | 'lore_keeper';

export interface ChatMessage {
  id: string;
  role: 'agent' | 'player' | 'system';
  agentType?: AgentType;
  playerName?: string;
  content: string;
  source?: MessageSource; // how the message was input
  sceneMedia?: SceneMedia; // attached media if agent sent one
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
  game_data_stats?: Record<string, unknown>;
  game_data_combat?: Record<string, unknown>;
  game_data_saves?: Record<string, unknown>;
  game_data_skills?: Record<string, unknown>;
  game_data_custom?: unknown[];
  equipment?: unknown[];
  created_at: string;
}
