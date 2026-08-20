// lib/character/export/fantasy-grounds/dnd35e.ts
// Generic CoreRPG-convention export for D&D 3.5E — no real FG 3.5E ruleset
// sample exists to verify against (unlike 5E/PF2E/AD&D/DCC), so this reuses
// the cross-ruleset-confirmed shapes documented in xml.ts (abilities
// score/total/bonus, hp total/wounds, classes/skilllist/languagelist/
// inventorylist as id-lists) and folds every 3.5E-specific mechanic (AC
// breakdown, BAB, grapple, spells-per-day grid, etc.) into <notes> rather
// than inventing ruleset-specific tag names with no real sample to check
// them against. FG ignores any tag it doesn't recognize on import, so a
// wrong guess costs nothing — see the 2026-08-19 policy update in
// .claude/commands/character-sheets.md.
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

export function exportDnd35e(data: AssembledCharacterData, equipment: unknown[]): string {
  const abilityScores = (data.abilityScores as Record<string, number>) ?? {};
  const savingThrows = (data.savingThrows as Record<string, number>) ?? {};
  const skills = (data.skills as Record<string, number> | undefined) ?? {};
  const classSkills = (data.classSkills as string[] | undefined) ?? [];
  const feats = (data.feats as string[] | undefined) ?? [];
  const specialAbilities = (data.specialAbilities as string[] | undefined) ?? [];
  const languages = (data.languages as string[] | undefined) ?? [];
  const money = (data.money as Record<string, number> | undefined) ?? {};
  const attacks = (data.attacks as Record<string, unknown>[] | undefined) ?? [];
  const spellsPerDay = (data.spellsPerDay as Record<string, unknown>[] | undefined) ?? [];
  const knownSpells = (data.knownSpells as Record<string, unknown>[] | undefined) ?? [];
  const acBreakdown = (data.acBreakdown as Record<string, number> | undefined) ?? {};
  const encumbrance = (data.encumbrance as Record<string, number> | undefined) ?? {};

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

  const savesXml = group(
    'saves',
    (['fortitude', 'reflex', 'will'] as const)
      .map((key) => (savingThrows[key] != null ? group(key, leaf('total', 'number', savingThrows[key])) : ''))
      .join('')
  );

  const acTotal = (data.ac as number) ?? 10;
  const defensesXml = group(
    'defenses',
    group(
      'ac',
      [
        leaf('total', 'number', acTotal),
        leaf('touch', 'number', (data.touchAC as number) ?? 10),
        leaf('flatfooted', 'number', (data.flatFootedAC as number) ?? 10),
      ].join('')
    )
  );

  const hpXml = group(
    'hp',
    [
      leaf('total', 'number', data.maxHp ?? 0),
      leaf('wounds', 'number', Math.max(0, (data.maxHp ?? 0) - (data.hp ?? 0))),
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

  const featlistXml = idList(
    'featlist',
    feats.map((f) => leaf('name', 'string', f))
  );

  const notesParts = [
    ...(classSkills.length > 0 ? [`Class Skills: ${classSkills.join(', ')}`] : []),
    ...(specialAbilities.length > 0 ? [`Special Abilities: ${specialAbilities.join('; ')}`] : []),
    ...(Object.keys(acBreakdown).length > 0
      ? [`AC Breakdown: ${Object.entries(acBreakdown).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...(data.baseAttackBonus != null ? [`Base Attack Bonus: ${data.baseAttackBonus}`] : []),
    ...(data.grappleModifier != null ? [`Grapple: ${data.grappleModifier}`] : []),
    ...(data.spellResistance != null ? [`Spell Resistance: ${data.spellResistance}`] : []),
    ...((data.damageReduction as string) ? [`Damage Reduction: ${data.damageReduction}`] : []),
    ...(data.arcaneSpellFailure != null ? [`Arcane Spell Failure: ${data.arcaneSpellFailure}%`] : []),
    ...((data.domainsSpecialtySchool as string)
      ? [`Domains / Specialty School: ${data.domainsSpecialtySchool}`]
      : []),
    ...(data.spellSaveDC != null ? [`Spell Save DC: ${data.spellSaveDC}`] : []),
    ...(Object.keys(money).length > 0
      ? [`Money: ${Object.entries(money).map(([k, v]) => `${v} ${k.toUpperCase()}`).join(', ')}`]
      : []),
    ...(Object.keys(encumbrance).length > 0
      ? [`Carrying Capacity: ${Object.entries(encumbrance).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...(attacks.length > 0
      ? [
          'Attacks:',
          ...attacks.map(
            (a) => `  - ${a.weapon ?? 'Unknown'}: ${a.attackBonus ?? '—'} to hit, ${a.damage ?? '—'} (${a.critical ?? '—'}, ${a.range ?? '—'})`
          ),
        ]
      : []),
    ...(spellsPerDay.length > 0
      ? [
          'Spells per Day:',
          ...spellsPerDay.map(
            (s) => `  - Level ${s.level ?? 0}: known ${s.spellsKnown ?? '—'}, DC ${s.saveDC ?? '—'}, per day ${s.perDay ?? '—'}, bonus ${s.bonusSpells ?? '—'}`
          ),
        ]
      : []),
    ...(knownSpells.length > 0
      ? ['Known Spells:', ...knownSpells.map((s) => `  - Level ${s.level ?? 0}: ${s.name ?? 'Unknown'}${s.prepared ? ` [${s.prepared}]` : ''}`)]
      : []),
    ...((data.playersName as string) ? [`Player's Name: ${data.playersName}`] : []),
    ...((data.campaign as string) ? [`Campaign: ${data.campaign}`] : []),
  ];
  const notesXml = notesParts.length > 0 ? leaf('notes', 'string', notesParts.join('\n')) : '';

  const inner = [
    leaf('name', 'string', data.name ?? ''),
    leaf('race', 'string', data.race ?? ''),
    leaf('alignment', 'string', (data.alignment as string) ?? ''),
    leaf('deity', 'string', (data.deity as string) ?? ''),
    leaf('exp', 'number', (data.experiencePoints as number) ?? 0),
    leaf('size', 'string', (data.size as string) ?? ''),
    leaf('speed', 'string', (data.speed as string) ?? ''),
    leaf('initiative', 'number', (data.initiative as number) ?? 0),
    abilitiesXml,
    savesXml,
    defensesXml,
    hpXml,
    classesXml,
    skilllistXml,
    languagelistXml,
    inventorylistXml,
    featlistXml,
    notesXml,
  ].join('');

  // Unconfirmed release string — no real FG 3.5E export sample exists to check
  // against. Envelope version/dataversion come from xml.ts's confirmed
  // install-wide constants (safe); this string is a best-effort guess only.
  return characterDocument(inner, '3.5E:1|CoreRPG:3');
}
