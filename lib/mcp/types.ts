// lib/mcp/types.ts
// Core MCP type system for tool definitions, agent messages, and context

import type { FlaggedNpc } from '@/lib/types/npc';

/** Tool definition — describes a tool agents can call */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema for parameters
}

/** Tool call request — what an agent sends */
export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/** Tool call result — what the server returns */
export interface MCPToolResult {
  content: string; // text result for the agent
  data?: Record<string, unknown>; // structured data if needed
  error?: string;
}

/** Context passed to every tool execution */
export interface MCPContext {
  campaignId: string;
  gameSystem: string; // GameSystem.id slug
  userId: string;
  characterId?: string; // active character if applicable
}

/** Agent message types for Claude API integration */
export type AgentRole =
  | 'game_master'
  | 'rules_arbiter'
  | 'lore_keeper';

/** Request sent to an AI agent */
export interface AgentRequest {
  agentRole: AgentRole;
  message: string; // player's input
  context: MCPContext;
  conversationHistory?: AgentMessage[];
}

/** A single message in an agent conversation */
export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Media the game_master wants to auto-attach to the scene, if any */
export interface AgentSceneMedia {
  type: 'image' | 'youtube';
  url?: string; // used when type === 'image'
  videoId?: string; // YouTube video ID, used when type === 'youtube'
  caption?: string;
  source: 'campaign_asset' | 'ai_generated' | 'module_reference';
}

/** Streaming result returned from an async generator agent */
export interface AgentStreamResult {
  content: string;
  agentRole: AgentRole;
  toolCalls?: MCPToolCall[];
  toolResults?: MCPToolResult[];
  flaggedNpcs?: FlaggedNpc[];
  sceneMedia?: AgentSceneMedia;
}

/** Response from an AI agent */
export interface AgentResponse {
  content: string; // agent's text response
  agentRole: AgentRole;
  toolCalls?: MCPToolCall[]; // tools the agent invoked
  toolResults?: MCPToolResult[]; // results from those calls
  flaggedNpcs?: FlaggedNpc[]; // NPCs the game_master flagged for the player to confirm
  sceneMedia?: AgentSceneMedia; // if agent wants to auto-attach media
}
