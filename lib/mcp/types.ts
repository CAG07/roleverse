// lib/mcp/types.ts
// Core MCP type system for tool definitions, agent messages, and context

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
  | 'narrator'
  | 'rules_arbiter'
  | 'npc_dialogue'
  | 'lore_keeper'
  | 'encounter_builder';

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

/** Response from an AI agent */
export interface AgentResponse {
  content: string; // agent's text response
  agentRole: AgentRole;
  toolCalls?: MCPToolCall[]; // tools the agent invoked
  toolResults?: MCPToolResult[]; // results from those calls
  sceneMedia?: {
    // if agent wants to display media
    type: 'image' | 'video';
    url: string;
    caption?: string;
    source: 'campaign_asset' | 'ai_generated';
  };
}
