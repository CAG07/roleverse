// lib/character/characterSheetColumns.ts
// The full column set needed to assemble and render a complete, non-compact
// character sheet (assembleCharacterData -> CharacterSheet/BaseSheet). Every
// query that feeds a full sheet render — the Characters screen, the in-session
// popout modal, anywhere else this grows to — selects from this single constant
// rather than hand-listing columns per call site, so the two can't silently
// drift apart the way they had before (the session route was missing
// game_data_abilities and spells that the Characters screen already selected).
export const CHARACTER_SHEET_COLUMNS =
  'id, name, class, race, level, hp, max_hp, notes, game_system, game_data_stats, game_data_combat, game_data_saves, game_data_skills, game_data_abilities, game_data_custom, equipment, spells, updated_at';
