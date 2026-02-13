// lib/game-systems/types.ts
// TypeScript interfaces for the game system abstraction layer

/** Configuration for a supported tabletop RPG system */
export interface GameSystem {
  /** Unique slug identifier (e.g. 'add-2e', 'dnd-5e-2014') */
  id: string;
  /** Display name (e.g. 'Advanced Dungeons & Dragons 2nd Edition') */
  name: string;
  /** Brief description of the game system */
  description: string;
  /** Primary die used in the system (e.g. 'd20', 'd100') */
  primaryDie: string;
  /** List of ability score names used by the system */
  abilityScores: string[];
  /** JSON schema or key fields describing a character in this system */
  characterSchema: Record<string, unknown>;
  /** System prompt snippet for AI agents to enforce rules */
  rulesPrompt: string;
  /** Fantasy Grounds ruleset identifier for bridge mapping */
  fgRulesetId: string;
}

/** Generic character data with system-specific extensions */
export interface CharacterData {
  /** Unique character identifier */
  id: string;
  /** Character name */
  name: string;
  /** Game system this character belongs to */
  gameSystemId: string;
  /** Character level */
  level: number;
  /** Character class or archetype */
  characterClass: string;
  /** Character race or ancestry */
  race: string;
  /** Ability score values keyed by score name */
  abilityScores: Record<string, number>;
  /** Additional system-specific data */
  systemData: Record<string, unknown>;
}

/** Parsed dice expression type */
export interface DiceNotation {
  /** Original notation string (e.g. '2d6+3') */
  notation: string;
  /** Number of dice to roll */
  count: number;
  /** Number of sides on each die */
  sides: number;
  /** Modifier to add to the roll total */
  modifier: number;
}
