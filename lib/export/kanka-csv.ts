// lib/export/kanka-csv.ts
// Builds CSV files shaped for Kanka's bulk CSV importer
// (docs.kanka.io/en/latest/features/campaigns/csv-import.html) — one file per
// entity type, first row = headers, `Name` always fully populated. Also
// generically useful for any other tool with a similar Name/Description/
// Type/Private CSV-import convention, not just Kanka specifically.
//
// Deliberately does NOT call Kanka's API or store any Kanka credential — the
// resulting file is downloaded locally and imported through Kanka's own web
// UI by the player. See .claude/commands/roadmap.md's "Permanently Ruled
// Out" section (BYOK) for why a live API integration was rejected in favor
// of this approach.

import { buildCsv } from './csv';
import { assembleCharacterData } from '@/lib/character/assembleCharacterData';
import { buildPlainTextSheet } from '@/lib/character/export/plain-text';
import type { Npc } from '@/lib/types/npc';

export interface KankaExportCharacterRow {
  name: string;
  class: string | null;
  race: string | null;
  level: number | null;
  hp: number | null;
  max_hp: number | null;
  game_data_stats?: Record<string, unknown> | null;
  game_data_combat?: Record<string, unknown> | null;
  game_data_saves?: Record<string, unknown> | null;
  game_data_skills?: Record<string, unknown> | null;
  game_data_abilities?: unknown[] | null;
  game_data_custom?: unknown[] | null;
  spells?: Record<string, unknown> | unknown[] | null;
  equipment?: unknown[] | null;
}

const CHARACTER_HEADERS = ['Name', 'Title', 'Type', 'Private', 'Description', 'Race', 'Class', 'Level', 'Alignment', 'HP', 'Max HP'];

export function buildCharactersKankaCsv(characters: KankaExportCharacterRow[], gameSystem: string): string {
  const rows = characters.map((row) => {
    const sheetData = assembleCharacterData(row);
    const description = buildPlainTextSheet(gameSystem, sheetData, row.equipment ?? []) ?? '';
    const titleParts = [row.class, row.level != null ? `Level ${row.level}` : null].filter(Boolean);
    const alignment = typeof sheetData.alignment === 'string' ? sheetData.alignment : '';
    return [
      row.name,
      titleParts.join(' '),
      'Player Character',
      'false',
      description,
      row.race ?? '',
      row.class ?? '',
      row.level != null ? String(row.level) : '',
      alignment,
      row.hp != null ? String(row.hp) : '',
      row.max_hp != null ? String(row.max_hp) : '',
    ];
  });
  return buildCsv(CHARACTER_HEADERS, rows);
}

const NPC_HEADERS = ['Name', 'Title', 'Type', 'Private', 'Description', 'Race', 'Disposition', 'Current Location', 'Known Facts'];

export function buildNpcsKankaCsv(npcs: Npc[]): string {
  const rows = npcs.map((npc) => {
    const descriptionParts = [npc.description, npc.personality, npc.voice_notes ? `Voice: ${npc.voice_notes}` : null].filter(
      Boolean
    );
    const knownFacts = (npc.known_facts ?? []).map((f) => f.fact).join('; ');
    return [
      npc.name,
      npc.occupation ?? '',
      'NPC',
      'false',
      descriptionParts.join('\n\n'),
      npc.race ?? '',
      npc.disposition,
      npc.current_location ?? '',
      knownFacts,
    ];
  });
  return buildCsv(NPC_HEADERS, rows);
}

export interface KankaExportSessionRow {
  started_at: string;
  summary: string | null;
  transcript: { role?: string; content?: string; agentType?: string }[] | null;
}

const SESSION_HEADERS = ['Name', 'Type', 'Private', 'Description'];

export function buildSessionsKankaCsv(sessions: KankaExportSessionRow[]): string {
  const rows = sessions.map((session) => {
    const dateLabel = new Date(session.started_at).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const description =
      session.summary ??
      (session.transcript && session.transcript.length > 0
        ? '(No AI summary was generated for this session — raw transcript not included in this row.)'
        : '(No content recorded for this session.)');
    return [`Session — ${dateLabel}`, 'Session Log', 'false', description];
  });
  return buildCsv(SESSION_HEADERS, rows);
}
