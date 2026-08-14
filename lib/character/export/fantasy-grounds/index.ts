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
    default:
      return null;
  }
}
