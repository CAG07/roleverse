export interface Feature {
  id: string;
  name: string;
  description: string;
  source?: string;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
  category?: string;
}

// What gets passed into <CharacterSheet>, assembled from a DB row
export interface AssembledCharacterData {
  name: string;
  race?: string | null;
  class?: string | null;
  level?: number | null;
  hp?: number | null;
  maxHp?: number | null;

  abilityScores: Record<string, number>;
  savingThrows: Record<string, number | string>;
  skills: Record<string, unknown>;

  // Combat fields are spread at top level (ac, thac0, etc.)
  [combatField: string]: unknown;

  features: Feature[];
  customFields: CustomField[];
}
