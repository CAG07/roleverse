// lib/mcp/server.ts
// MCP server — manages tool registration and execution

import type { MCPContext, MCPToolCall, MCPToolDefinition, MCPToolResult } from './types';

/** Handler function signature for tool execution */
export type MCPToolHandler = (
  args: Record<string, unknown>,
  context: MCPContext
) => Promise<MCPToolResult>;

/** Internal registry entry pairing a definition with its handler */
interface ToolRegistryEntry {
  definition: MCPToolDefinition;
  handler: MCPToolHandler;
}

/** Internal registry of all registered tools keyed by name */
const toolRegistry = new Map<string, ToolRegistryEntry>();

/**
 * Register a tool with the MCP server.
 * @throws if a tool with the same name is already registered
 */
export function registerTool(definition: MCPToolDefinition, handler: MCPToolHandler): void {
  if (toolRegistry.has(definition.name)) {
    throw new Error(`Tool "${definition.name}" is already registered`);
  }
  toolRegistry.set(definition.name, { definition, handler });
}

/** Return all registered tool definitions (for Claude tool_use schema) */
export function getToolDefinitions(): MCPToolDefinition[] {
  return Array.from(toolRegistry.values()).map((entry) => entry.definition);
}

/**
 * Execute a tool call with the given context.
 * Returns a MCPToolResult — on handler errors the result carries an `error` field
 * rather than throwing.
 */
export async function executeTool(call: MCPToolCall, context: MCPContext): Promise<MCPToolResult> {
  const entry = toolRegistry.get(call.name);
  if (!entry) {
    const available = Array.from(toolRegistry.keys()).join(', ');
    return {
      content: '',
      error: `Unknown tool: "${call.name}". Available tools: ${available}`,
    };
  }

  try {
    return await entry.handler(call.arguments, context);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: '',
      error: `Tool "${call.name}" failed: ${message}`,
    };
  }
}
