// lib/character/generate-premade.ts
// One-shot, server-side "generate a premade character" utility, backing the
// Generate Premade Character button on the character-creation form. This is
// NOT a session agent — it never touches lib/mcp/coordinator.ts's three-role
// router, has no conversation history, and runs exactly one non-streaming
// Claude call per invocation. Its output only ever pre-fills the existing
// creation form for the player to review/edit; nothing is inserted directly.
//
// Structured output is forced via Anthropic tool-use (the same mechanism
// lib/mcp/agents/game-master.ts already uses for flagNpc), with the tool's
// input_schema built dynamically from the target system's SystemSheetSchema —
// matching this codebase's existing "no per-system hardcoding" convention, and
// automatically covering any future system added to lib/character/sheet-schema/.
import Anthropic from '@anthropic-ai/sdk';
import { getSheetSchema } from './sheet-schema';
import { getGameSystem } from '@/lib/game-systems/registry';
import type { SheetField, SchemaDraft, KeyedDraft, OpenDraft, TableDraft } from './sheet-schema/types';

function getRequiredModel(): string {
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) throw new Error('ANTHROPIC_MODEL environment variable is required');
  return model;
}

const MODEL = getRequiredModel();

/** Lifetime cap, per campaign, on calls to either "Generate Premade"
 *  endpoint (character or NPC — tracked as separate counters). Anti-abuse/
 *  cost guard, not a roster-size limit — generated results that never get
 *  saved still count. See campaigns.character_generation_count /
 *  npc_generation_count (20260819000000_campaign_generation_limits.sql). */
export const MAX_PREMADE_GENERATIONS = 5;
const MAX_TOKENS = 2048;

export interface GeneratedCharacter {
  name: string;
  race: string;
  class: string;
  level: number;
  hp: number;
  maxHp: number;
  notes: string;
  systemFields: { abilityScores: Record<string, string>; fields: SchemaDraft };
}

// ---------------------------------------------------------------------------
// Dynamic tool schema — one JSON Schema property per universal field + per
// ability score + per schema field, typed by the field's own `kind`.
// ---------------------------------------------------------------------------

function fieldSchema(field: SheetField): Record<string, unknown> {
  switch (field.kind) {
    case 'number':
      return { type: 'integer', description: field.label };
    case 'string':
    case 'text':
      return { type: 'string', description: field.label };
    case 'string-list':
      return { type: 'array', items: { type: 'string' }, description: field.label };
    case 'record-fixed':
    case 'spell-slots': {
      const keys = field.kind === 'record-fixed' ? field.keys : field.levels;
      return {
        type: 'object',
        properties: Object.fromEntries(keys.map((k) => [k, { type: 'integer' }])),
        description: field.label,
      };
    }
    case 'record-open':
      return {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, value: { type: 'integer' } },
          required: ['name', 'value'],
        },
        description: field.label,
      };
    case 'table':
      return {
        type: 'array',
        items: {
          type: 'object',
          properties: Object.fromEntries(
            field.columns.map((col) => [col.key, { type: col.type === 'number' ? 'integer' : 'string' }])
          ),
        },
        description: field.label,
      };
    default:
      return { type: 'string' };
  }
}

export function buildCharacterGenerationTool(gameSystem: string): Anthropic.Messages.Tool {
  const schema = getSheetSchema(gameSystem);
  const abilityNames = getGameSystem(gameSystem)?.abilityScores ?? [];

  return {
    name: 'generateCharacter',
    description: `Generate a complete, playable premade ${getGameSystem(gameSystem)?.name ?? gameSystem} character.`,
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Character name' },
        race: { type: 'string', description: 'Race or ancestry' },
        class: { type: 'string', description: 'Class' },
        level: { type: 'integer' },
        hp: { type: 'integer', description: 'Current hit points' },
        maxHp: { type: 'integer', description: 'Maximum hit points' },
        notes: { type: 'string', description: 'Brief background/personality flavor text' },
        abilityScores:
          abilityNames.length > 0
            ? {
                type: 'object',
                properties: Object.fromEntries(abilityNames.map((n) => [n, { type: 'integer' }])),
                required: abilityNames,
              }
            : { type: 'object' },
        fields:
          schema && schema.fields.length > 0
            ? {
                type: 'object',
                properties: Object.fromEntries(schema.fields.map((f) => [f.key, fieldSchema(f)])),
              }
            : { type: 'object' },
      },
      required: ['name'],
    },
  };
}

// ---------------------------------------------------------------------------
// Raw tool_use.input -> the string-based draft shapes SystemFields/BaseSheet
// already work with (SchemaDraft, ability score strings).
// ---------------------------------------------------------------------------

function toFieldDraft(field: SheetField, raw: unknown): SchemaDraft[string] {
  switch (field.kind) {
    case 'number':
      return typeof raw === 'number' ? String(raw) : '';
    case 'string':
    case 'text':
      return typeof raw === 'string' ? raw.trim() : '';
    case 'string-list':
      return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string').join('\n') : '';
    case 'record-fixed': {
      const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      const draft: KeyedDraft = {};
      for (const k of field.keys) draft[k] = typeof obj[k] === 'number' ? String(obj[k]) : '';
      return draft;
    }
    case 'spell-slots': {
      const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      const draft: KeyedDraft = {};
      for (const lvl of field.levels) draft[lvl] = typeof obj[lvl] === 'number' ? String(obj[lvl]) : '';
      return draft;
    }
    case 'record-open': {
      if (!Array.isArray(raw)) return [] as OpenDraft;
      return raw
        .filter((e): e is { name: unknown; value: unknown } => !!e && typeof e === 'object')
        .map((e) => ({
          name: typeof e.name === 'string' ? e.name.trim() : '',
          value: typeof e.value === 'number' ? String(e.value) : '',
        }))
        .filter((e) => e.name.length > 0) as OpenDraft;
    }
    case 'table': {
      if (!Array.isArray(raw)) return [] as TableDraft;
      return raw
        .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
        .map((row) =>
          Object.fromEntries(
            field.columns.map((col) => {
              const v = row[col.key];
              return [col.key, v != null ? String(v) : ''];
            })
          )
        );
    }
    default:
      return '';
  }
}

function clampLevel(raw: unknown, gameSystem: string): number {
  const n = typeof raw === 'number' ? raw : 1;
  const min = gameSystem === 'DCC' ? 0 : 1;
  return Math.max(min, Math.min(30, Math.round(n)));
}

export async function generatePremadeCharacter(gameSystem: string, hint?: string): Promise<GeneratedCharacter> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set');

  const schema = getSheetSchema(gameSystem);
  const abilityNames = getGameSystem(gameSystem)?.abilityScores ?? [];
  const tool = buildCharacterGenerationTool(gameSystem);
  const client = new Anthropic({ apiKey });

  const systemName = getGameSystem(gameSystem)?.name ?? gameSystem;
  const userPrompt = hint?.trim()
    ? `Generate a premade ${systemName} character: ${hint.trim()}`
    : `Generate an interesting, well-rounded premade ${systemName} character with a memorable name and personality.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system:
      `You generate mechanically sound, playable tabletop RPG characters for ${systemName}. ` +
      'Fill in every field the tool schema offers where the system supports it. Use realistic ' +
      'ability scores and derived values for the system and level requested. Always call the ' +
      'generateCharacter tool with your result — do not respond with plain text.',
    tools: [tool],
    tool_choice: { type: 'tool', name: 'generateCharacter' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use' && b.name === 'generateCharacter'
  );
  if (!toolUse) throw new Error('Character generation did not return a result');

  const input = toolUse.input as Record<string, unknown>;

  const abilityScoresRaw = (input.abilityScores as Record<string, unknown> | undefined) ?? {};
  const abilityScores: Record<string, string> = Object.fromEntries(
    abilityNames.map((n) => [n, typeof abilityScoresRaw[n] === 'number' ? String(abilityScoresRaw[n]) : ''])
  );

  const fieldsRaw = (input.fields as Record<string, unknown> | undefined) ?? {};
  const fields: SchemaDraft = {};
  if (schema) {
    for (const field of schema.fields) {
      fields[field.key] = toFieldDraft(field, fieldsRaw[field.key]);
    }
  }

  const maxHp = typeof input.maxHp === 'number' ? Math.max(1, Math.round(input.maxHp)) : 1;
  const hp = typeof input.hp === 'number' ? Math.max(0, Math.min(maxHp, Math.round(input.hp))) : maxHp;

  return {
    name: typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'Unnamed Character',
    race: typeof input.race === 'string' ? input.race.trim() : '',
    class: typeof input.class === 'string' ? input.class.trim() : '',
    level: clampLevel(input.level, gameSystem),
    hp,
    maxHp,
    notes: typeof input.notes === 'string' ? input.notes.trim() : '',
    systemFields: { abilityScores, fields },
  };
}
