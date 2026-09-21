// lib/character/export/fantasy-grounds/index.ts
// Dispatches a one-way Fantasy Grounds export by game system. See each system's
// module for confidence level — 5E, DCC, and AD&D 1E/2E are now grounded in real
// exported/campaign XML (DCC and AD&D as of 2026-08-13); PF2E is still verified
// only against a third-party tool's sample, not real exported Fantasy Grounds data.
import type { AssembledCharacterData } from '@/lib/types/character';
import { exportDnd5e } from './dnd5e';
import { exportPf2e } from './pf2e';
import { exportAdd } from './add';
import { exportDcc } from './dcc';
import { exportDnd35e } from './dnd35e';
import { exportDnd4e } from './dnd4e';
import { exportTor2e } from './tor2e';
import { exportCyberpunk2020 } from './cyberpunk2020';
import { exportFallout2d20 } from './fallout2d20';

export interface FantasyGroundsExport {
  filename: string;
  content: string;
  mimeType: string;
}

function slugName(name: string | undefined): string {
  const slug = (name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'character';
}

export function buildFantasyGroundsExport(
  gameSystem: string,
  data: AssembledCharacterData,
  equipment: unknown[]
): FantasyGroundsExport | null {
  const slug = slugName(data.name);
  switch (gameSystem) {
    case '5E_2014':
      return { filename: `${slug}-5e.xml`, content: exportDnd5e(data, equipment), mimeType: 'application/xml' };
    case 'PATHFINDER_2E':
      return { filename: `${slug}-pf2e.xml`, content: exportPf2e(data, equipment), mimeType: 'application/xml' };
    case 'ADD1E':
    case 'ADD2E':
      return {
        filename: `${slug}-${gameSystem.toLowerCase()}.xml`,
        content: exportAdd(gameSystem, data, equipment),
        mimeType: 'application/xml',
      };
    case 'DCC':
      return { filename: `${slug}-dcc.xml`, content: exportDcc(data, equipment), mimeType: 'application/xml' };
    case '3_5E':
      return { filename: `${slug}-3-5e.xml`, content: exportDnd35e(data, equipment), mimeType: 'application/xml' };
    case '4E':
      return { filename: `${slug}-4e.xml`, content: exportDnd4e(data, equipment), mimeType: 'application/xml' };
    case 'TOR2E':
      return { filename: `${slug}-tor2e.xml`, content: exportTor2e(data, equipment), mimeType: 'application/xml' };
    case 'CYBERPUNK_2020':
      return {
        filename: `${slug}-cyberpunk2020.xml`,
        content: exportCyberpunk2020(data, equipment),
        mimeType: 'application/xml',
      };
    case 'FALLOUT_2D20':
      return {
        filename: `${slug}-fallout2d20.xml`,
        content: exportFallout2d20(data, equipment),
        mimeType: 'application/xml',
      };
    default:
      return null;
  }
}
