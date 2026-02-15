// lib/types/session.ts
// Shared types for the session UI components

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
  | 'narrator'
  | 'rules_arbiter'
  | 'npc_dialogue'
  | 'lore_keeper'
  | 'encounter_builder';

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
