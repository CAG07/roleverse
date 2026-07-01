// lib/mcp/tools/build-encounter.ts
// Encounter building tool: party XP budget math + monster retrieval from the rules index.
// Deterministic retrieval and arithmetic only — no AI text generation.

import { searchRules } from '@/lib/rag/search';
import { createClient } from '@/lib/supabase/server';
import type { MCPContext } from '../types';

// ---------------------------------------------------------------------------
// 5E XP thresholds per character level (DMG encounter building, Table 3-3)
// ---------------------------------------------------------------------------

const XP_THRESHOLDS_5E: Record<number, Record<string, number>> = {
  1:  { easy: 25,   medium: 50,   hard: 75,    deadly: 100   },
  2:  { easy: 50,   medium: 100,  hard: 150,   deadly: 200   },
  3:  { easy: 75,   medium: 150,  hard: 225,   deadly: 400   },
  4:  { easy: 125,  medium: 250,  hard: 375,   deadly: 500   },
  5:  { easy: 250,  medium: 500,  hard: 750,   deadly: 1100  },
  6:  { easy: 300,  medium: 600,  hard: 900,   deadly: 1400  },
  7:  { easy: 350,  medium: 750,  hard: 1100,  deadly: 1700  },
  8:  { easy: 450,  medium: 900,  hard: 1400,  deadly: 2100  },
  9:  { easy: 550,  medium: 1100, hard: 1600,  deadly: 2400  },
  10: { easy: 600,  medium: 1200, hard: 1900,  deadly: 2800  },
  11: { easy: 800,  medium: 1600, hard: 2400,  deadly: 3600  },
  12: { easy: 1000, medium: 2000, hard: 3000,  deadly: 4500  },
  13: { easy: 1100, medium: 2200, hard: 3400,  deadly: 5100  },
  14: { easy: 1250, medium: 2500, hard: 3800,  deadly: 5700  },
  15: { easy: 1400, medium: 2800, hard: 4300,  deadly: 6400  },
  16: { easy: 1600, medium: 3200, hard: 4800,  deadly: 7200  },
  17: { easy: 2000, medium: 3900, hard: 5900,  deadly: 8800  },
  18: { easy: 2100, medium: 4200, hard: 6300,  deadly: 9500  },
  19: { easy: 2400, medium: 4900, hard: 7300,  deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500,  deadly: 12700 },
};

// ---------------------------------------------------------------------------
// Encounter multiplier (DMG encounter building, monster count adjustment)
// ---------------------------------------------------------------------------

function encounterMultiplier(monsterCount: number, partySize: number): number {
  let mult: number;
  if (monsterCount === 1)       mult = 1;
  else if (monsterCount === 2)  mult = 1.5;
  else if (monsterCount <= 6)   mult = 2;
  else if (monsterCount <= 10)  mult = 2.5;
  else if (monsterCount <= 14)  mult = 3;
  else                          mult = 4;

  if (partySize <= 2) mult *= 1.5;
  else if (partySize >= 6) mult *= 0.5;

  return mult;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BuildEncounterInput {
  environment?: string;
  desired_difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
  monster_theme?: string;
}

export interface MonsterCandidate {
  name: string;
  cr?: string;
  xp?: number;
  hp?: string;
  ac?: string;
  rawText: string;
}

export interface SelectedMonster {
  name: string;
  count: number;
  cr?: string;
  xpEach?: number;
  rawText: string;
}

export interface BuildEncounterOutput {
  partySize: number;
  averageLevel: number;
  xpBudget: number;
  difficulty: string;
  gameSystem: string;
  selectedMonsters: SelectedMonster[];
  candidates: MonsterCandidate[];
  note?: string;
}

// ---------------------------------------------------------------------------
// Party query
// ---------------------------------------------------------------------------

async function fetchParty(campaignId: string): Promise<{ size: number; averageLevel: number }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('characters')
      .select('level')
      .eq('campaign_id', campaignId);

    if (!data || data.length === 0) return { size: 1, averageLevel: 1 };

    const levels = (data as { level: number | null }[]).map((c) => c.level ?? 1);
    const avg = Math.round(levels.reduce((a, b) => a + b, 0) / levels.length);
    return { size: data.length, averageLevel: Math.max(1, Math.min(20, avg)) };
  } catch {
    return { size: 1, averageLevel: 1 };
  }
}

// ---------------------------------------------------------------------------
// XP budget
// ---------------------------------------------------------------------------

function computeXpBudget(partySize: number, averageLevel: number, difficulty: string): number {
  const level = Math.max(1, Math.min(20, averageLevel));
  const perChar = XP_THRESHOLDS_5E[level]?.[difficulty] ?? XP_THRESHOLDS_5E[1].easy;
  return perChar * partySize;
}

// ---------------------------------------------------------------------------
// Monster extraction from RAG text
// ---------------------------------------------------------------------------

function extractMonsterData(text: string): {
  name?: string;
  cr?: string;
  xp?: number;
  hp?: string;
  ac?: string;
} {
  // CR + XP: "Challenge 1/4 (50 XP)" or "Challenge 5 (1,800 XP)"
  const crXpMatch = text.match(/Challenge\s+(\d+(?:\/\d+)?)\s*\((\d[\d,]*)\s*XP\)/i);
  const cr = crXpMatch?.[1];
  const xp = crXpMatch ? parseInt(crXpMatch[2].replace(/,/g, ''), 10) : undefined;

  // HP: "Hit Points 45 (7d8 + 14)" or "Hit Points 45"
  const hpMatch = text.match(/Hit Points?\s+(\d+(?:\s*\([^)]+\))?)/i);
  const hp = hpMatch?.[1]?.trim();

  // AC: "Armor Class 14 (natural armor)"
  const acMatch = text.match(/Armor Class\s+(\d+[^\n]*)/i);
  const ac = acMatch?.[1]?.split('\n')[0]?.trim();

  // Monster name: markdown heading "## Goblin" or bold "**Goblin**" or leading capitalized words
  const nameMatch = text.match(/^#+\s*(.+)$/m)
    ?? text.match(/^\*\*([A-Z][^*\n]+)\*\*/m)
    ?? text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/m);
  const name = (nameMatch?.[1] ?? nameMatch?.[2])?.trim();

  return { name, cr, xp, hp, ac };
}

// ---------------------------------------------------------------------------
// Monster group selection — greedy, within budget
// ---------------------------------------------------------------------------

function selectEncounterGroup(
  candidates: MonsterCandidate[],
  budget: number,
  partySize: number
): SelectedMonster[] {
  const withXp = candidates.filter((c) => typeof c.xp === 'number' && c.xp > 0);
  if (withXp.length === 0) return [];

  // Sort by XP descending so we start with higher-CR creatures
  const sorted = [...withXp].sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));

  // Try single monster types with 1–8 copies
  for (const candidate of sorted) {
    const base = candidate.xp!;
    for (let count = 1; count <= 8; count++) {
      const adjusted = base * count * encounterMultiplier(count, partySize);
      if (adjusted <= budget * 1.1) {
        return [{ name: candidate.name, count, cr: candidate.cr, xpEach: base, rawText: candidate.rawText }];
      }
    }
  }

  // Fallback: one of the highest-CR creature even if over budget
  return [{ name: sorted[0].name, count: 1, cr: sorted[0].cr, xpEach: sorted[0].xp, rawText: sorted[0].rawText }];
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function executeBuildEncounter(
  input: BuildEncounterInput,
  context: MCPContext
): Promise<BuildEncounterOutput> {
  const { environment, desired_difficulty, monster_theme } = input;
  const { size: partySize, averageLevel } = await fetchParty(context.campaignId);
  const is5E = context.gameSystem.toUpperCase().includes('5E');

  const searchQuery = [monster_theme, environment, 'monster creature']
    .filter(Boolean)
    .join(' ');

  const results = await searchRules(searchQuery, {
    gameSystem: context.gameSystem,
    campaignId: context.campaignId,
  });

  const candidates: MonsterCandidate[] = results.map((r) => {
    const extracted = extractMonsterData(r.content);
    return {
      name: extracted.name ?? 'Unknown creature',
      cr: extracted.cr,
      xp: extracted.xp,
      hp: extracted.hp,
      ac: extracted.ac,
      rawText: r.content,
    };
  });

  if (!is5E) {
    return {
      partySize,
      averageLevel,
      xpBudget: 0,
      difficulty: desired_difficulty,
      gameSystem: context.gameSystem,
      selectedMonsters: [],
      candidates,
      note: `${context.gameSystem} monster index is not fully populated. Stats may be incomplete — use training knowledge to supplement.`,
    };
  }

  const xpBudget = computeXpBudget(partySize, averageLevel, desired_difficulty);
  const selectedMonsters = selectEncounterGroup(candidates, xpBudget, partySize);

  return {
    partySize,
    averageLevel,
    xpBudget,
    difficulty: desired_difficulty,
    gameSystem: context.gameSystem,
    selectedMonsters,
    candidates,
  };
}
