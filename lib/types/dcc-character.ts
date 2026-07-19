// lib/types/dcc-character.ts
// DCC (Dungeon Crawl Classics) character data shape.
// Stored in the characters table's flexible game_data_stats JSONB column —
// there is no DCC-specific migration; this interface documents the contract
// that DCCFields.tsx (creation) and DCCSheet.tsx (display) agree on.

export interface DCCMercurialSpell {
  spell: string;
  effect: string;
}

export interface DCCEquipmentItem {
  name: string;
  quantity?: number;
  notes?: string;
}

export interface DCCWeapon {
  name: string;
  attackMod: number;
  damage: string;
  notes?: string;
}

export interface DCCSpell {
  name: string;
  level: number;
  mercurialEffect?: string;
}

export interface DCCCharacterData {
  // Core
  level: number;
  occupation: string;
  alignment: 'Lawful' | 'Neutral' | 'Chaotic';

  // Luck (unique to DCC) — an ability score AND a spendable/burnable resource
  currentLuck: number;
  startingLuck: number;
  luckySign: string; // birth augur description

  // Class-specific
  deedDie?: string; // e.g. 'd3', 'd4' — Warriors/Dwarves only
  disapprovalRange?: number; // Clerics only, starts at 1
  corruption?: string[]; // Wizards/Elves only
  mercurialMagic?: DCCMercurialSpell[]; // Wizards/Elves

  // Standard
  hp: { current: number; max: number };
  ac: number;
  saves: { fortitude: number; reflex: number; willpower: number }; // DCC uses 3 saves
  equipment: DCCEquipmentItem[];
  weapons: DCCWeapon[];
  spells?: DCCSpell[];
}
