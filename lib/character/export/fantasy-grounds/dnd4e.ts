// lib/character/export/fantasy-grounds/dnd4e.ts
// Generic CoreRPG-convention export for D&D 4E — no real FG 4E ruleset sample
// exists to verify against, so this reuses the cross-ruleset-confirmed shapes
// documented in xml.ts and folds every 4E-specific mechanic (defenses,
// surges, powers, feats) into <notes> rather than inventing ruleset-specific
// tag names with no real sample to check them against. See the 2026-08-19
// policy update in .claude/commands/character-sheets.md.
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

export function exportDnd4e(data: AssembledCharacterData, equipment: unknown[]): string {
  const abilityScores = (data.abilityScores as Record<string, number>) ?? {};
  const otherDefenses = (data.otherDefenses as Record<string, number> | undefined) ?? {};
  const skills = (data.skills as Record<string, number> | undefined) ?? {};
  const trainedSkills = (data.trainedSkills as string[] | undefined) ?? [];
  const languages = (data.languages as string[] | undefined) ?? [];
  const attacks = (data.attacks as Record<string, unknown>[] | undefined) ?? [];
  const powers = (data.powers as Record<string, unknown>[] | undefined) ?? [];
  const featsSpecialFeatures = (data.featsSpecialFeatures as string[] | undefined) ?? [];
  const rituals = (data.rituals as string[] | undefined) ?? [];
  const magicItems = (data.magicItems as string[] | undefined) ?? [];
  const companionsAllies = (data.companionsAllies as string[] | undefined) ?? [];
  const carryingCapacity = (data.carryingCapacity as Record<string, number> | undefined) ?? {};

  const abilitiesXml = group(
    'abilities',
    ABILITIES.map(({ full, tag }) => {
      const score = abilityScores[full];
      if (score == null) return '';
      return group(
        tag,
        [leaf('score', 'number', score), leaf('bonus', 'number', abilityModifier(score)), leaf('total', 'number', score)].join('')
      );
    }).join('')
  );

  const acTotal = (data.ac as number) ?? 10;
  const defensesXml = group(
    'defenses',
    [
      group('ac', leaf('total', 'number', acTotal)),
      ...(['fortitude', 'reflex', 'will'] as const).map((key) =>
        otherDefenses[key] != null ? group(key, leaf('total', 'number', otherDefenses[key])) : ''
      ),
    ].join('')
  );

  const hpXml = group(
    'hp',
    [
      leaf('total', 'number', data.maxHp ?? 0),
      leaf('wounds', 'number', Math.max(0, (data.maxHp ?? 0) - (data.hp ?? 0))),
      leaf('temporary', 'number', (data.tempHp as number) ?? 0),
    ].join('')
  );

  const classesXml = idList('classes', [
    [leaf('name', 'string', data.class ?? ''), leaf('level', 'number', data.level ?? 1)].join(''),
  ]);

  const skilllistXml = idList(
    'skilllist',
    Object.entries(skills).map(([name, total]) => [leaf('name', 'string', name), leaf('total', 'number', total)].join(''))
  );

  const languagelistXml = idList(
    'languagelist',
    languages.map((l) => leaf('name', 'string', l))
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

  const powerlistXml = idList(
    'powerlist',
    powers.map((p) =>
      [
        leaf('name', 'string', (p.name as string) ?? ''),
        leaf('usage', 'string', (p.usage as string) ?? ''),
        leaf('level', 'string', (p.levelKeywords as string) ?? ''),
        leaf('range', 'string', (p.typeRange as string) ?? ''),
        leaf('effect', 'string', (p.effects as string) ?? ''),
      ].join('')
    )
  );

  const notesParts = [
    ...(trainedSkills.length > 0 ? [`Trained Skills: ${trainedSkills.join(', ')}`] : []),
    ...(data.initiative != null ? [`Initiative: ${data.initiative}`] : []),
    ...(data.speed ? [`Speed: ${data.speed}`] : []),
    ...(data.bloodied != null ? [`Bloodied: ${data.bloodied}`] : []),
    ...(data.surgeValue != null ? [`Surge Value: ${data.surgeValue}`] : []),
    ...(data.surgesPerDay != null ? [`Surges per Day: ${data.surgesPerDay}`] : []),
    ...(data.currentSurges != null ? [`Current Surges: ${data.currentSurges}`] : []),
    ...(data.actionPoints != null ? [`Action Points: ${data.actionPoints}`] : []),
    ...(attacks.length > 0
      ? ['Attacks:', ...attacks.map((a) => `  - ${a.name ?? 'Unknown'} vs ${a.vsDefense ?? '—'}: ${a.attackBonus ?? '—'}, ${a.damage ?? '—'}`)]
      : []),
    ...(featsSpecialFeatures.length > 0 ? [`Feats & Special Features: ${featsSpecialFeatures.join('; ')}`] : []),
    ...(rituals.length > 0 ? [`Rituals: ${rituals.join('; ')}`] : []),
    ...(magicItems.length > 0 ? [`Magic Items: ${magicItems.join('; ')}`] : []),
    ...(companionsAllies.length > 0 ? [`Companions & Allies: ${companionsAllies.join('; ')}`] : []),
    ...(Object.keys(carryingCapacity).length > 0
      ? [`Carrying Capacity: ${Object.entries(carryingCapacity).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...((data.wealth as string) ? [`Money & Other Wealth: ${data.wealth}`] : []),
    ...((data.paragonPath as string) ? [`Paragon Path: ${data.paragonPath}`] : []),
    ...((data.epicDestiny as string) ? [`Epic Destiny: ${data.epicDestiny}`] : []),
    ...((data.deityReligion as string) ? [`Deity / Religion: ${data.deityReligion}`] : []),
    ...((data.description as string) ? [`Description: ${data.description}`] : []),
    ...((data.personality as string) ? [`Personality: ${data.personality}`] : []),
    ...((data.backgroundNotes as string) ? [`Background & Notes: ${data.backgroundNotes}`] : []),
  ];
  const notesXml = notesParts.length > 0 ? leaf('notes', 'string', notesParts.join('\n')) : '';

  const inner = [
    leaf('name', 'string', data.name ?? ''),
    leaf('race', 'string', data.race ?? ''),
    leaf('alignment', 'string', (data.alignment as string) ?? ''),
    leaf('exp', 'number', (data.experiencePoints as number) ?? 0),
    abilitiesXml,
    defensesXml,
    hpXml,
    classesXml,
    skilllistXml,
    languagelistXml,
    inventorylistXml,
    powerlistXml,
    notesXml,
  ].join('');

  // Unconfirmed release string — no real FG 4E export sample exists to check
  // against (FG's own official 4E ruleset support has historically been
  // limited/community-maintained). Best-effort guess only.
  return characterDocument(inner, '4E:1|CoreRPG:3');
}
