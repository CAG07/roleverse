// lib/character/export/fantasy-grounds/pf2e.ts
// Maps a PATHFINDER_2E AssembledCharacterData onto Fantasy Grounds' single-character
// XML export shape. Verified against a real exported character sample bundled as
// test fixture in a Pathbuilder->FG importer extension (joshleblanc/fg_pathbuilder_import,
// data/charsheet_example.xml) rather than official docs — FG publishes no formal
// schema for this format. A few sheet sections (classdc breakdown, spellcasting
// tradition nodes) weren't present in that sample and are approximated here.
//
// 2026-08-19: added temporary HP / dying / wounded (folded into the existing hp
// group / new sibling groups — standard PF2E-ruleset concepts, high confidence
// even though not in the one confirmed sample) and spell attack/DC as direct
// best-effort leaves. Everything else added in the same character-sheets depth
// pass (player name, heritage/class notes, AC breakdown, shield, strikes,
// currency, magical tradition, cantrip/focus stats, known spells, special
// actions, and the full origin/personality/campaign-notes block) folds into a
// new top-level <notes> rather than inventing more specific tag names for
// structures this file has no real sample to check against — an unrecognized
// tag is simply ignored by FG on import, but <notes> guarantees the data is
// visible somewhere regardless. Same fold-into-notes pattern as add.ts/dcc.ts.
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
  const currency = (data.currency as Record<string, number> | undefined) ?? {};
  const acBreakdown = (data.acBreakdown as Record<string, number> | undefined) ?? {};
  const shield = (data.shield as Record<string, number> | undefined) ?? {};
  const strikes = (data.strikes as Record<string, unknown>[] | undefined) ?? [];
  const knownSpells = (data.knownSpells as Record<string, unknown>[] | undefined) ?? [];
  const specialActions = (data.specialActions as Record<string, unknown>[] | undefined) ?? [];

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
    [
      leaf('current', 'number', data.hp ?? 0),
      leaf('total', 'number', data.maxHp ?? 0),
      leaf('temporary', 'number', (data.temporaryHp as number) ?? 0),
    ].join('')
  );
  const dyingXml = group('dying', leaf('total', 'number', (data.dying as number) ?? 0));
  const woundedXml = group('wounded', leaf('total', 'number', (data.wounded as number) ?? 0));

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

  const currencyLine =
    Object.keys(currency).length > 0
      ? `Currency: ${Object.entries(currency)
          .map(([k, v]) => `${v} ${k.toUpperCase()}`)
          .join(', ')}`
      : null;
  const acBreakdownLine =
    Object.keys(acBreakdown).length > 0
      ? `AC Breakdown: ${Object.entries(acBreakdown)
          .map(([k, v]) => `${k} ${v}`)
          .join(', ')}`
      : null;
  const shieldLine =
    Object.keys(shield).length > 0
      ? `Shield: ${Object.entries(shield)
          .map(([k, v]) => `${k} ${v}`)
          .join(', ')}`
      : null;
  const strikesLines =
    strikes.length > 0
      ? [
          'Strikes:',
          ...strikes.map(
            (s) =>
              `  - ${s.weapon ?? 'Unknown'} (${s.type ?? '—'}): ${s.attackBonus ?? '—'} to hit, ${s.damage ?? '—'}${s.traits ? ` [${s.traits}]` : ''}`
          ),
        ]
      : [];
  const knownSpellsLines =
    knownSpells.length > 0
      ? [
          'Known Spells:',
          ...knownSpells.map(
            (s) =>
              `  - ${s.name ?? 'Unknown'} (Rank ${s.rank ?? 0}${s.type ? `, ${s.type}` : ''})${s.prepared ? ` [${s.prepared}]` : ''}${s.cost ? ` — Cost: ${s.cost}` : ''}`
          ),
        ]
      : [];
  const specialActionsLines =
    specialActions.length > 0
      ? [
          'Special Actions & Reactions:',
          ...specialActions.map(
            (a) =>
              `  - ${a.name ?? 'Unknown'}${a.trigger ? ` (Trigger: ${a.trigger})` : ''}${a.traits ? ` [${a.traits}]` : ''}: ${a.effects ?? ''}`
          ),
        ]
      : [];
  const notesParts = [
    ...((data.playersName as string) ? [`Player's Name: ${data.playersName}`] : []),
    ...((data.heritageTraits as string) ? [`Heritage and Traits: ${data.heritageTraits}`] : []),
    ...((data.classNotes as string) ? [`Class Notes: ${data.classNotes}`] : []),
    ...(acBreakdownLine ? [acBreakdownLine] : []),
    ...(shieldLine ? [shieldLine] : []),
    ...strikesLines,
    ...(currencyLine ? [currencyLine] : []),
    ...((data.magicalTradition as string) ? [`Magical Tradition: ${data.magicalTradition}`] : []),
    ...((data.casterType as string) ? [`Caster Type: ${data.casterType}`] : []),
    ...(data.spellAttack != null ? [`Spell Attack: ${data.spellAttack}`] : []),
    ...(data.spellDC != null ? [`Spell DC: ${data.spellDC}`] : []),
    ...(data.cantripsPerDay != null ? [`Cantrips per Day: ${data.cantripsPerDay}`] : []),
    ...(data.cantripRank != null ? [`Cantrip Rank: ${data.cantripRank}`] : []),
    ...(data.focusSpellRank != null ? [`Focus Spell Rank: ${data.focusSpellRank}`] : []),
    ...knownSpellsLines,
    ...specialActionsLines,
    ...((data.ethnicity as string) ? [`Ethnicity: ${data.ethnicity}`] : []),
    ...((data.nationality as string) ? [`Nationality: ${data.nationality}`] : []),
    ...((data.birthplace as string) ? [`Birthplace: ${data.birthplace}`] : []),
    ...((data.age as string) ? [`Age: ${data.age}`] : []),
    ...((data.genderPronouns as string) ? [`Gender & Pronouns: ${data.genderPronouns}`] : []),
    ...((data.height as string) ? [`Height: ${data.height}`] : []),
    ...((data.weight as string) ? [`Weight: ${data.weight}`] : []),
    ...((data.appearance as string) ? [`Appearance: ${data.appearance}`] : []),
    ...((data.attitude as string) ? [`Attitude: ${data.attitude}`] : []),
    ...((data.deityOrPhilosophy as string) ? [`Deity or Philosophy: ${data.deityOrPhilosophy}`] : []),
    ...((data.edicts as string) ? [`Edicts: ${data.edicts}`] : []),
    ...((data.anathema as string) ? [`Anathema: ${data.anathema}`] : []),
    ...((data.likes as string) ? [`Likes: ${data.likes}`] : []),
    ...((data.dislikes as string) ? [`Dislikes: ${data.dislikes}`] : []),
    ...((data.catchphrases as string) ? [`Catchphrases: ${data.catchphrases}`] : []),
    ...((data.campaignNotes as string) ? [`Campaign Notes: ${data.campaignNotes}`] : []),
    ...((data.allies as string) ? [`Allies: ${data.allies}`] : []),
    ...((data.enemies as string) ? [`Enemies: ${data.enemies}`] : []),
    ...((data.organizations as string) ? [`Organizations: ${data.organizations}`] : []),
  ];
  const notesXml = notesParts.length > 0 ? leaf('notes', 'string', notesParts.join('\n')) : '';

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
    leaf('spellattack', 'number', (data.spellAttack as number) ?? 0),
    leaf('spelldc', 'number', (data.spellDC as number) ?? 0),
    group('class', [leaf('name', 'string', data.class ?? ''), leaf('level', 'number', data.level ?? 1)].join('')),
    abilitiesXml,
    acXml,
    savesXml,
    hpXml,
    dyingXml,
    woundedXml,
    skilllistXml,
    resistWeakXml,
    conditionsXml,
    languagelistXml,
    featlistXml,
    inventorylistXml,
    focusSpells.length > 0 ? leaf('focusspellnotes', 'string', focusSpells.join('\n')) : '',
    leaf('focuspoints', 'number', (data.focusPoints as number) ?? 0),
    spellSlotsXml,
    notesXml,
  ].join('');

  // Unconfirmed — no real PF2E export sample has surfaced a release string yet
  // (unlike 5E/AD&D/DCC, all now confirmed from real files). Placeholder pending
  // an actual exported PF2E character; low-risk if wrong since this attribute
  // appears to be a version-compatibility stamp rather than something FG uses
  // for parsing correctness.
  return characterDocument(inner, '1|PFRPG2:1|CoreRPG:7');
}
