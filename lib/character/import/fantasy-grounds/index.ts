// lib/character/import/fantasy-grounds/index.ts
// Dispatches a Fantasy Grounds XML character import by game system. DCC is
// deliberately excluded — lib/character/export/fantasy-grounds/dcc.ts targets
// a plain-text document instead of FG's XML specifically because FG's DCC
// ruleset schema is closed with no sample to work from (see
// .claude/commands/character-sheets.md); that means there's no shape to
// invert here either.
import { parseFGAddCharacterXml } from './parse-add';
import { parseFGDnd5eCharacterXml } from './parse-dnd5e';
import { parseFGPf2eCharacterXml } from './parse-pf2e';
import type { ParsedCharacterImport } from '../types';

export const FG_XML_IMPORT_SUPPORTED_SYSTEMS = new Set(['5E_2014', 'PATHFINDER_2E', 'ADD1E', 'ADD2E']);

export function parseFantasyGroundsCharacterXml(
  gameSystem: string,
  xmlText: string
): ParsedCharacterImport | { error: string } {
  switch (gameSystem) {
    case '5E_2014':
      return parseFGDnd5eCharacterXml(xmlText);
    case 'PATHFINDER_2E':
      return parseFGPf2eCharacterXml(xmlText);
    case 'ADD1E':
    case 'ADD2E':
      return parseFGAddCharacterXml(xmlText);
    default:
      return { error: 'Fantasy Grounds import is not available for this game system.' };
  }
}
