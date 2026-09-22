// lib/character/import/types.ts
// Shared shape produced by every character importer (Fantasy Grounds XML,
// plain text) — whatever built the review/diff screen and the eventual write
// to the `characters` table only needs to know this shape, not which format
// the file came from. Mirrors ParsedFGCharacter (lib/character/import/
// fantasy-grounds/parse-add.ts), which predates this file and is structurally
// compatible with it.

export interface ParsedCharacterImport {
  name?: string;
  race?: string;
  class?: string;
  level?: number;
  hp?: number | null;
  maxHp?: number | null;
  /** Freeform text found in the source file that couldn't be split into
   *  individual fields (an FG <notes> leaf, or nothing for plain-text
   *  imports). Always APPENDED to the character's existing notes on apply —
   *  never used to replace them. */
  notes?: string;
  columns: {
    stats: Record<string, unknown>;
    combat: Record<string, unknown>;
    saves: Record<string, unknown>;
    skills: Record<string, unknown>;
  };
  equipment?: { name: string; quantity?: number }[];
}
