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

  // game_data_stats/_combat/_saves/_skills are spread at top level (abilityScores,
  // ac, thac0, savingThrows, skills, etc. — whatever keys each system's schema uses).
  [dataField: string]: unknown;

  features: Feature[];
  customFields: CustomField[];
}
