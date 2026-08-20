// lib/character/export/fantasy-grounds/dnd5e.ts
// Maps a 5E_2014 AssembledCharacterData onto Fantasy Grounds' single-character
// XML export shape. Verified against a real exported character sample
// (JDCain/FG5eXmlToPdf, FG5eXmlToPdf.Tests/XML/rita.xml) rather than official
// docs — FG publishes no formal schema for this format. Import in FG via the
// PC sheet's import-arrow control, or the `/importchar` console command.
//
// 2026-08-19: added age/height/weight/eyes/skin/hair as direct best-effort
// leaves — standard fields on FG's 5E "Personality" info tab, high confidence
// even though not in the one confirmed sample. Everything else added in the
// same character-sheets depth pass (currency, spellcasting ability/DC/attack,
// known spells, appearance/backstory/allies/treasure) folds into a new
// top-level <notes> instead of inventing more specific tag names: an unknown
// tag is simply ignored by FG on import (no risk to the rest of the parse),
// but a tag FG DOES recognize with the wrong shape could still just be blank
// — <notes> guarantees the data is visible somewhere. See add.ts and dcc.ts
// for the same fold-into-notes pattern already used elsewhere in this file
// family.
import type { AssembledCharacterData } from '@/lib/types/character';
import { abilityModifier, characterDocument, group, idList, leaf, mentionedIn } from './xml';

const ABILITIES: { full: string; tag: string; abbr: string }[] = [
  { full: 'Strength', tag: 'strength', abbr: 'STR' },
  { full: 'Dexterity', tag: 'dexterity', abbr: 'DEX' },
  { full: 'Constitution', tag: 'constitution', abbr: 'CON' },
  { full: 'Intelligence', tag: 'intelligence', abbr: 'INT' },
  { full: 'Wisdom', tag: 'wisdom', abbr: 'WIS' },
  { full: 'Charisma', tag: 'charisma', abbr: 'CHA' },
];

const SKILLS: { key: string; name: string; ability: string }[] = [
  { key: 'acrobatics', name: 'Acrobatics', ability: 'dexterity' },
  { key: 'animalHandling', name: 'Animal Handling', ability: 'wisdom' },
  { key: 'arcana', name: 'Arcana', ability: 'intelligence' },
  { key: 'athletics', name: 'Athletics', ability: 'strength' },
  { key: 'deception', name: 'Deception', ability: 'charisma' },
  { key: 'history', name: 'History', ability: 'intelligence' },
  { key: 'insight', name: 'Insight', ability: 'wisdom' },
  { key: 'intimidation', name: 'Intimidation', ability: 'charisma' },
  { key: 'investigation', name: 'Investigation', ability: 'intelligence' },
  { key: 'medicine', name: 'Medicine', ability: 'wisdom' },
  { key: 'nature', name: 'Nature', ability: 'intelligence' },
  { key: 'perception', name: 'Perception', ability: 'wisdom' },
  { key: 'performance', name: 'Performance', ability: 'charisma' },
  { key: 'persuasion', name: 'Persuasion', ability: 'charisma' },
  { key: 'religion', name: 'Religion', ability: 'intelligence' },
  { key: 'sleightOfHand', name: 'Sleight of Hand', ability: 'dexterity' },
  { key: 'stealth', name: 'Stealth', ability: 'dexterity' },
  { key: 'survival', name: 'Survival', ability: 'wisdom' },
];

function equipmentItemNode(raw: unknown): string {
  const r = (raw && typeof raw === 'object' ? raw : { name: String(raw) }) as Record<string, unknown>;
  const name = (r.name as string) ?? (r.item as string) ?? (r.title as string) ?? 'Unknown item';
  const count = (r.quantity as number) ?? (r.qty as number) ?? (r.count as number) ?? 1;
  const weight = (r.weight as number) ?? (r.lbs as number) ?? 0;
  return [leaf('name', 'string', name), leaf('count', 'number', count), leaf('weight', 'number', weight)].join('');
}

export function exportDnd5e(data: AssembledCharacterData, equipment: unknown[]): string {
  const abilityScores = (data.abilityScores as Record<string, number>) ?? {};
  const savingThrows = (data.savingThrows as Record<string, number>) ?? {};
  const savingThrowProfs = (data.savingThrowProficiencies as string[]) ?? [];
  const skills = (data.skills as Record<string, number>) ?? {};
  const skillProfs = (data.skillProficiencies as string[]) ?? [];
  const languages = (data.languages as string[]) ?? [];
  const featuresTraits = (data.featuresTraits as string[]) ?? [];
  const equipmentProficiencies = (data.equipmentProficiencies as string[]) ?? [];
  const attacks = (data.attacks as string[]) ?? [];
  const deathSaves = (data.deathSaves as Record<string, number>) ?? {};
  const spellSlots = (data.spellSlots as Record<string, number>) ?? {};
  const currency = (data.currency as Record<string, number> | undefined) ?? {};
  const knownSpells = (data.knownSpells as Record<string, unknown>[] | undefined) ?? [];

  const abilitiesXml = group(
    'abilities',
    ABILITIES.map(({ full, tag, abbr }) => {
      const score = abilityScores[full];
      if (score == null) return '';
      const bonus = abilityModifier(score);
      const proficient = mentionedIn(savingThrowProfs, full) || mentionedIn(savingThrowProfs, abbr);
      const save = savingThrows[abbr] ?? bonus;
      return group(
        tag,
        [
          leaf('score', 'number', score),
          leaf('bonus', 'number', bonus),
          leaf('save', 'number', save),
          leaf('saveprof', 'number', proficient ? 1 : 0),
        ].join('')
      );
    }).join('')
  );

  const acTotal = (data.ac as number) ?? 10;
  const defensesXml = group('defenses', group('ac', leaf('total', 'number', acTotal)));

  const hpXml = group(
    'hp',
    [
      leaf('total', 'number', data.maxHp ?? 0),
      leaf('wounds', 'number', Math.max(0, (data.maxHp ?? 0) - (data.hp ?? 0))),
      leaf('deathsavesuccess', 'number', deathSaves.successes ?? 0),
      leaf('deathsavefail', 'number', deathSaves.failures ?? 0),
    ].join('')
  );

  const classesXml = idList('classes', [
    [leaf('name', 'string', data.class ?? ''), leaf('level', 'number', data.level ?? 1)].join(''),
  ]);

  const skilllistXml = idList(
    'skilllist',
    SKILLS.map(({ key, name, ability }) => {
      const total = skills[key];
      if (total == null) return '';
      const proficient = mentionedIn(skillProfs, name);
      return [
        leaf('name', 'string', name),
        leaf('stat', 'string', ability),
        leaf('prof', 'number', proficient ? 1 : 0),
        leaf('total', 'number', total),
      ].join('');
    })
  );

  const languagelistXml = idList(
    'languagelist',
    languages.map((l) => leaf('name', 'string', l))
  );

  const inventorylistXml = idList('inventorylist', equipment.map(equipmentItemNode));

  // Sub-tag naming (spellslotsN, not levelN) confirmed via a real DCC export's
  // <powermeta><spellslots1><max>... structure — same CoreRPG-derived convention.
  const spellSlotsXml = group(
    'powermeta',
    Object.entries(spellSlots)
      .map(([lvl, count]) => group(`spellslots${lvl}`, leaf('max', 'number', count)))
      .join('')
  );

  const currencyLine =
    Object.keys(currency).length > 0
      ? `Currency: ${Object.entries(currency)
          .map(([k, v]) => `${v} ${k.toUpperCase()}`)
          .join(', ')}`
      : null;
  const knownSpellsLines =
    knownSpells.length > 0
      ? [
          'Known Spells:',
          ...knownSpells.map((s) => {
            const level = s.level != null ? `Level ${s.level}` : 'Cantrip';
            const prepared = s.prepared ? ` [${s.prepared}]` : '';
            return `  - ${level}: ${s.name ?? 'Unknown'}${prepared}`;
          }),
        ]
      : [];
  const notesParts = [
    ...(currencyLine ? [currencyLine] : []),
    ...((data.spellcastingAbility as string)
      ? [`Spellcasting Ability: ${data.spellcastingAbility}`]
      : []),
    ...(data.spellSaveDC != null ? [`Spell Save DC: ${data.spellSaveDC}`] : []),
    ...(data.spellAttackModifier != null ? [`Spell Attack Modifier: ${data.spellAttackModifier}`] : []),
    ...knownSpellsLines,
    ...((data.characterAppearance as string)
      ? [`Character Appearance: ${data.characterAppearance}`]
      : []),
    ...((data.characterBackstory as string)
      ? [`Character Backstory: ${data.characterBackstory}`]
      : []),
    ...((data.alliesOrganizations as string)
      ? [`Allies & Organizations: ${data.alliesOrganizations}`]
      : []),
    ...((data.treasureNotes as string) ? [`Treasure: ${data.treasureNotes}`] : []),
  ];
  const notesXml = notesParts.length > 0 ? leaf('notes', 'string', notesParts.join('\n')) : '';

  const inner = [
    leaf('name', 'string', data.name ?? ''),
    leaf('race', 'string', data.race ?? ''),
    leaf('alignment', 'string', (data.alignment as string) ?? ''),
    leaf('background', 'string', (data.background as string) ?? ''),
    leaf('exp', 'number', (data.experiencePoints as number) ?? 0),
    leaf('perception', 'number', (data.passivePerception as number) ?? 10),
    leaf('initiative', 'number', (data.initiative as number) ?? 0),
    leaf('speed', 'string', (data.speed as string) ?? ''),
    leaf('age', 'string', (data.age as string) ?? ''),
    leaf('height', 'string', (data.height as string) ?? ''),
    leaf('weight', 'string', (data.weight as string) ?? ''),
    leaf('eyes', 'string', (data.eyes as string) ?? ''),
    leaf('skin', 'string', (data.skin as string) ?? ''),
    leaf('hair', 'string', (data.hair as string) ?? ''),
    notesXml,
    abilitiesXml,
    defensesXml,
    hpXml,
    classesXml,
    skilllistXml,
    languagelistXml,
    inventorylistXml,
    equipmentProficiencies.length > 0
      ? leaf('proficiencies', 'string', equipmentProficiencies.join(', '))
      : '',
    attacks.length > 0 ? leaf('attacknotes', 'string', attacks.join('\n')) : '',
    featuresTraits.length > 0 ? leaf('featurenotes', 'string', featuresTraits.join('\n')) : '',
    leaf('personalitytraits', 'string', (data.personalityTraits as string) ?? ''),
    leaf('ideals', 'string', (data.ideals as string) ?? ''),
    leaf('bonds', 'string', (data.bonds as string) ?? ''),
    leaf('flaws', 'string', (data.flaws as string) ?? ''),
    spellSlotsXml,
  ].join('');

  return characterDocument(inner, '8|CoreRPG:3');
}
