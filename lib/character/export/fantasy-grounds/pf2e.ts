// lib/character/export/fantasy-grounds/pf2e.ts
// Maps a PATHFINDER_2E AssembledCharacterData onto Fantasy Grounds' single-character
// XML export shape. Verified against a real exported character sample bundled as
// test fixture in a Pathbuilder->FG importer extension (joshleblanc/fg_pathbuilder_import,
// data/charsheet_example.xml) rather than official docs — FG publishes no formal
// schema for this format. A few sheet sections (classdc breakdown, spellcasting
// tradition nodes) weren't present in that sample and are approximated here.
import type { AssembledCharacterData } from '@/lib/types/character';
import { abilityModifier, characterDocument, group, idList, leaf } from './xml';

const ABILITIES: { full: string; tag: string }[] = [
  { full: 'Strength', tag: 'strength' },
  { full: 'Dexterity', tag: 'dexterity' },
  { full: 'Constitution', tag: 'constitution' },
  { full: 'Intelligence', tag: 'intelligence' },
  { full: 'Wisdom', tag: 'wisdom' },
  { full: 'Charisma', tag: 'charisma' },
];

const SAVES: { key: string; tag: string }[] = [
  { key: 'fortitude', tag: 'fortitude' },
  { key: 'reflex', tag: 'reflex' },
  { key: 'will', tag: 'will' },
];

export function exportPf2e(data: AssembledCharacterData, equipment: unknown[]): string {
  const abilityScores = (data.abilityScores as Record<string, number>) ?? {};
  const savingThrows = (data.savingThrows as Record<string, number>) ?? {};
  const proficiencyRanks = (data.proficiencyRanks as Record<string, number>) ?? {};
  const skills = (data.skills as Record<string, number>) ?? {};
  const resistancesWeaknesses = (data.resistancesWeaknesses as Record<string, number>) ?? {};
  const conditions = (data.conditions as Record<string, number>) ?? {};
  const languages = (data.languages as string[]) ?? [];
  const feats = (data.feats as string[]) ?? [];
  const focusSpells = (data.focusSpells as string[]) ?? [];
  const spellSlots = (data.spellSlots as Record<string, number>) ?? {};

  const abilitiesXml = group(
    'abilities',
    ABILITIES.map(({ full, tag }) => {
      const score = abilityScores[full];
      if (score == null) return '';
      return group(tag, [leaf('score', 'number', score), leaf('bonus', 'number', abilityModifier(score))].join(''));
    }).join('')
  );

  const acXml = group('ac', group('totals', leaf('general', 'number', (data.ac as number) ?? 10)));

  const savesXml = group(
    'saves',
    SAVES.map(({ key, tag }) => {
      const total = savingThrows[key];
      if (total == null) return '';
      const rank = proficiencyRanks[key];
      return group(
        tag,
        [leaf('total', 'number', total), rank != null ? leaf('proflevel', 'number', rank) : ''].join('')
      );
    }).join('')
  );

  const hpXml = group(
    'hp',
    [leaf('current', 'number', data.hp ?? 0), leaf('total', 'number', data.maxHp ?? 0)].join('')
  );

  const skilllistXml = idList(
    'skilllist',
    Object.entries(skills).map(([name, total]) => {
      const rank = proficiencyRanks[name];
      return [
        leaf('label', 'string', name),
        leaf('total', 'number', total),
        rank != null ? leaf('proflevel', 'number', rank) : '',
      ].join('');
    })
  );

  const resistWeakXml = idList(
    'resistancelist',
    Object.entries(resistancesWeaknesses).map(([name, value]) =>
      [leaf('label', 'string', name), leaf('total', 'number', value)].join('')
    )
  );

  const conditionsXml = idList(
    'conditionlist',
    Object.entries(conditions).map(([name, value]) =>
      [leaf('name', 'string', name), leaf('level', 'number', value)].join('')
    )
  );

  const languagelistXml = idList(
    'languagelist',
    languages.map((l) => leaf('name', 'string', l))
  );

  const featlistXml = idList(
    'featlist',
    feats.map((f) => leaf('name', 'string', f))
  );

  const inventorylistXml = idList(
    'inventorylist',
    equipment.map((raw) => {
      const r = (raw && typeof raw === 'object' ? raw : { name: String(raw) }) as Record<string, unknown>;
      const name = (r.name as string) ?? (r.item as string) ?? 'Unknown item';
      const count = (r.quantity as number) ?? (r.qty as number) ?? (r.count as number) ?? 1;
      return [leaf('name', 'string', name), leaf('count', 'number', count)].join('');
    })
  );

  // Sub-tag naming (spellslotsN, not levelN) confirmed via a real DCC export's
  // <powermeta><spellslots1><max>... structure — same CoreRPG-derived convention.
  const spellSlotsXml = group(
    'powermeta',
    Object.entries(spellSlots)
      .map(([lvl, count]) => group(`spellslots${lvl}`, leaf('max', 'number', count)))
      .join('')
  );

  const inner = [
    leaf('name', 'string', data.name ?? ''),
    leaf('race', 'string', data.race ?? ''),
    leaf('alignment', 'string', (data.alignment as string) ?? ''),
    leaf('size', 'string', (data.size as string) ?? ''),
    leaf('senses', 'string', (data.senses as string) ?? ''),
    leaf('speed', 'string', (data.speed as string) ?? ''),
    leaf('exp', 'number', (data.experiencePoints as number) ?? 0),
    leaf('hero', 'number', (data.heroPoints as number) ?? 0),
    leaf('classdc', 'number', (data.classDC as number) ?? 0),
    leaf('perceptiontotal', 'number', (data.perception as number) ?? 0),
    group('class', [leaf('name', 'string', data.class ?? ''), leaf('level', 'number', data.level ?? 1)].join('')),
    abilitiesXml,
    acXml,
    savesXml,
    hpXml,
    skilllistXml,
    resistWeakXml,
    conditionsXml,
    languagelistXml,
    featlistXml,
    inventorylistXml,
    focusSpells.length > 0 ? leaf('focusspellnotes', 'string', focusSpells.join('\n')) : '',
    leaf('focuspoints', 'number', (data.focusPoints as number) ?? 0),
    spellSlotsXml,
  ].join('');

  // Unconfirmed — no real PF2E export sample has surfaced a release string yet
  // (unlike 5E/AD&D/DCC, all now confirmed from real files). Placeholder pending
  // an actual exported PF2E character; low-risk if wrong since this attribute
  // appears to be a version-compatibility stamp rather than something FG uses
  // for parsing correctness.
  return characterDocument(inner, '1|PFRPG2:1|CoreRPG:7');
}
