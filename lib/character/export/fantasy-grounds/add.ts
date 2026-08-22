// lib/character/export/fantasy-grounds/add.ts
// Shared exporter for ADD1E and ADD2E, targeting Fantasy Grounds' built-in, free,
// WotC-licensed "D&D Classics" 2E ruleset — confirmed to explicitly support both
// 1E and 2E play, with OSRIC (the same OGL retro-clone this project already uses
// for RAG) running on top of it as authorized FG Forge content.
//
// Verified 2026-08-13 in three passes against real Fantasy Grounds campaign data
// (an unconfigured blank 2E record, the same record once named "Enos", and a real
// standalone single-character export "Enos.xml"):
//   - THAC0 lives under <combat><thaco> (not a flat <thac0>), 10 individual save
//     categories fan out from RoleVerse's 5 broad ones, <classes>/<languagelist>/
//     <inventorylist> are id-lists, thief skills share the generic <skilllist>
//     (a <total> field, not <percent> — there's no dedicated <thiefskilllist>).
//
// 2026-08-21: re-verified against a SECOND real standalone export — an actual
// FG-native pregen character never touched by RoleVerse ("Adran Holimion",
// AD&D 2E, Elf Diviner) — which corrected and substantially extended the
// picture above:
//   - CORRECTED: the 2026-08-13 finding that "<race> has no plain-text sibling
//     next to <racelink>" was wrong (or true only for that specific older
//     sample) — this new sample has both a real <race> leaf AND <racelink>
//     side by side. The "duplicate race into <notes> as a workaround" line is
//     removed accordingly.
//   - CORRECTED: saves use <base>/<score>, NOT <total> — the 2026-08-13 pass
//     never actually saw a save populated with a live value to catch this.
//   - NEW: ability score nodes carry many more real per-ability sub-fields
//     than previously known — RoleVerse's six *Adjustments records now map
//     mostly onto real tags instead of falling into notes (see
//     ABILITY_ADJUSTMENT_FIELDS below). A few sub-fields (INT's min/max
//     spells per level) still have no confirmed home and stay in notes.
//   - NEW: <coins> is real (6 slots: PP/GP/EP/SP/CP/unnamed) — RoleVerse's
//     `treasure` (platinum/gold/silver only) now maps onto slots 1/2/4.
//   - NEW: <encumbrance><load> is real and much simpler than assumed.
//   - NEW: <weaponlist> is real (attackbonus/carried/damagelist with
//     dice+bonus/name), matching the shape already confirmed for DCC —
//     RoleVerse's `weaponAttacks` table now populates it instead of only
//     contributing weapon names to <proficiencylist>.
//   - NEW: per-class <expneeded> is real (nested under <classes><id-NNNNN>,
//     not top-level) — RoleVerse's `xpNeededForNextLevel` now goes there.
//   - NEW: <numberattacks> is a real top-level string field, previously not
//     populated at all.
//   - NEW: <ac> and <thaco> each also exist as flat top-level scalars in
//     addition to their detailed <defenses>/<combat> homes — both are now
//     emitted for safety/compatibility, matching the real file exactly.
//   - STILL UNCONFIRMED: this sample's one populated <proficiencylist> entry
//     turned out to be a racial combat-bonus note ("Proficient" / elf's +1
//     with swords), not a weapon-by-weapon list — casts doubt on, but does
//     not disprove, populating it with weapon names (still the best
//     available guess pending a sample with an actual multi-weapon
//     proficiency list). Left as-is.
//   - STILL UNCONFIRMED: the real <defenses><ac> breakdown fields are
//     armor/base/misc/shield/total — a genuinely different shape than
//     RoleVerse's `acBreakdown` (base/withoutShield/rear/withoutDexterityBonus).
//     They don't decompose into each other, and this sample's character is
//     unarmored (every sub-field is 0 or equal to total), so there's no way
//     to confirm the mapping from a sample that doesn't exercise it. Guessing
//     wrong VALUES here (as opposed to an unrecognized tag) risks showing a
//     visibly incorrect AC breakdown on the sheet, which is worse than
//     omitting it — stays in <notes> pending a populated armored sample.
import type { AssembledCharacterData } from '@/lib/types/character';
import { characterDocument, diceLeaf, group, idList, leaf } from './xml';

const THIEF_SKILL_LABELS: Record<string, string> = {
  pickPockets: 'Pick Pockets',
  openLocks: 'Open Locks',
  findRemoveTraps: 'Find/Remove Traps',
  moveSilently: 'Move Silently',
  hideInShadows: 'Hide in Shadows',
  hearNoise: 'Hear Noise',
  climbWalls: 'Climb Walls',
  readLanguages: 'Read Languages',
};

const ABILITIES: { full: string; tag: string }[] = [
  { full: 'Strength', tag: 'strength' },
  { full: 'Dexterity', tag: 'dexterity' },
  { full: 'Constitution', tag: 'constitution' },
  { full: 'Intelligence', tag: 'intelligence' },
  { full: 'Wisdom', tag: 'wisdom' },
  { full: 'Charisma', tag: 'charisma' },
];

// RoleVerse's broad save category -> FG's individual sub-categories sharing that value.
const SAVE_FANOUT: Record<string, string[]> = {
  paralyzation: ['paralyzation', 'poison', 'death'],
  rod: ['rod', 'staff', 'wand'],
  petrification: ['petrification', 'polymorph'],
  breath: ['breath'],
  spell: ['spell'],
};

interface AdjustmentField {
  dataKey: string;
  subKey: string;
  fgTag: string;
  fgType: 'number' | 'string';
}

// RoleVerse's six *Adjustments records -> real per-ability FG sub-fields,
// confirmed against the Adran Holimion sample (2026-08-21). Sub-keys not
// listed here (e.g. Intelligence's min/max spells per level) have no
// confirmed home and fall through to <notes> — see remainingAdjustmentNote.
const ABILITY_ADJUSTMENT_FIELDS: Record<string, AdjustmentField[]> = {
  strength: [
    { dataKey: 'strAdjustments', subKey: 'toHit', fgTag: 'hitadj', fgType: 'number' },
    { dataKey: 'strAdjustments', subKey: 'damage', fgTag: 'dmgadj', fgType: 'number' },
    { dataKey: 'strAdjustments', subKey: 'opensDoors', fgTag: 'opendoors', fgType: 'string' },
    { dataKey: 'strAdjustments', subKey: 'weightAllowance', fgTag: 'weightallow', fgType: 'number' },
    { dataKey: 'strAdjustments', subKey: 'bendBarsLiftGates', fgTag: 'bendbars', fgType: 'number' },
  ],
  intelligence: [
    { dataKey: 'intAdjustments', subKey: 'bonusLanguages', fgTag: 'languages', fgType: 'number' },
    { dataKey: 'intAdjustments', subKey: 'spellLearnChance', fgTag: 'learn', fgType: 'number' },
  ],
  wisdom: [
    { dataKey: 'wisAdjustments', subKey: 'magicAttackAdjustment', fgTag: 'magicdefenseadj', fgType: 'number' },
    { dataKey: 'wisAdjustments', subKey: 'bonusSpells', fgTag: 'spellbonus', fgType: 'string' },
    { dataKey: 'wisAdjustments', subKey: 'spellFailureChance', fgTag: 'failure', fgType: 'number' },
  ],
  dexterity: [
    { dataKey: 'dexAdjustments', subKey: 'missileAttackAdjustment', fgTag: 'hitadj', fgType: 'number' },
    { dataKey: 'dexAdjustments', subKey: 'armorClassAdjustment', fgTag: 'defenseadj', fgType: 'number' },
    { dataKey: 'dexAdjustments', subKey: 'reactionAdjustment', fgTag: 'reactionadj', fgType: 'number' },
  ],
  constitution: [
    { dataKey: 'conAdjustments', subKey: 'hpAdjustment', fgTag: 'hitpointadj', fgType: 'string' },
    { dataKey: 'conAdjustments', subKey: 'systemShockSurvival', fgTag: 'systemshock', fgType: 'number' },
    { dataKey: 'conAdjustments', subKey: 'resurrectionSurvival', fgTag: 'resurrectionsurvival', fgType: 'number' },
  ],
  charisma: [
    { dataKey: 'chrAdjustments', subKey: 'maxHenchmen', fgTag: 'maxhench', fgType: 'number' },
    { dataKey: 'chrAdjustments', subKey: 'loyaltyBase', fgTag: 'loyalty', fgType: 'number' },
    { dataKey: 'chrAdjustments', subKey: 'reactionAdjustment', fgTag: 'reaction', fgType: 'number' },
  ],
};

/** First dice-notation substring and any flat +/-N bonus after it, e.g.
 *  "1d4+1 / 1d3+1" -> { dice: '1d4', bonus: 1 } — same "take the first one,
 *  don't try to represent alternate melee/thrown damage" approach as DCC's
 *  dieOnly() helper, extended to also capture a bonus since RoleVerse's
 *  weapon damage strings commonly include one. */
function firstDiceAndBonus(damage: string | undefined): { dice?: string; bonus?: number } {
  if (!damage) return {};
  const match = damage.match(/(\d*d\d+)\s*([+-]\s*\d+)?/i);
  if (!match) return {};
  return {
    dice: match[1].toLowerCase(),
    bonus: match[2] ? parseInt(match[2].replace(/\s/g, ''), 10) : undefined,
  };
}

export function exportAdd(gameSystem: 'ADD1E' | 'ADD2E', data: AssembledCharacterData, equipment: unknown[]): string {
  const abilityScores = (data.abilityScores as Record<string, number>) ?? {};
  const savingThrows = (data.savingThrows as Record<string, number>) ?? {};
  const weaponAttacks = (data.weaponAttacks as Record<string, unknown>[] | undefined) ?? [];
  const nonWeaponProficiencies = (data.nonWeaponProficiencies as string[] | undefined) ?? [];
  const classAbilities = (data.classAbilities as string[]) ?? [];
  const thiefSkills = (data.thiefSkills as Record<string, number>) ?? {};
  const languages = (data.languages as string[]) ?? [];
  const spellSlots = (data.spellSlots as Record<string, number>) ?? {};
  const movementRates = (data.movementRates as Record<string, number> | undefined) ?? {};
  const acBreakdown = (data.acBreakdown as Record<string, number> | undefined) ?? {};
  const treasure = (data.treasure as Record<string, number> | undefined) ?? {};
  const turnUndeadTable = (data.turnUndeadTable as Record<string, number> | undefined) ?? {};
  const animalCompanions = (data.animalCompanions as Record<string, unknown>[] | undefined) ?? [];
  const baseThac0 = (data.thac0 as number) ?? 20;

  const adjustmentGroups: [string, string, Record<string, number> | undefined][] = [
    ['strength', 'Strength', data.strAdjustments as Record<string, number> | undefined],
    ['intelligence', 'Intelligence', data.intAdjustments as Record<string, number> | undefined],
    ['wisdom', 'Wisdom', data.wisAdjustments as Record<string, number> | undefined],
    ['dexterity', 'Dexterity', data.dexAdjustments as Record<string, number> | undefined],
    ['constitution', 'Constitution', data.conAdjustments as Record<string, number> | undefined],
    ['charisma', 'Charisma', data.chrAdjustments as Record<string, number> | undefined],
  ];

  const abilitiesXml = group(
    'abilities',
    ABILITIES.map(({ full, tag }) => {
      const score = abilityScores[full];
      if (score == null) return '';
      const adjustmentLeaves = (ABILITY_ADJUSTMENT_FIELDS[tag] ?? [])
        .map((field) => {
          const record = data[field.dataKey] as Record<string, number> | undefined;
          const value = record?.[field.subKey];
          if (value == null) return '';
          return leaf(field.fgTag, field.fgType, field.fgType === 'string' ? String(value) : value);
        })
        .join('');
      return group(tag, [leaf('score', 'number', score), leaf('total', 'number', score), adjustmentLeaves].join(''));
    }).join('')
  );

  const savesXml = group(
    'saves',
    Object.entries(SAVE_FANOUT)
      .flatMap(([roleverseKey, fgTags]) => {
        const value = savingThrows[roleverseKey];
        if (value == null) return [];
        return fgTags.map((tag) =>
          group(tag, [leaf('base', 'number', value), leaf('score', 'number', value)].join(''))
        );
      })
      .join('')
  );

  const combatXml = group('combat', group('thaco', leaf('score', 'number', baseThac0)));

  const ac = (data.ac as number) ?? 10;
  const defensesXml = group(
    'defenses',
    group('ac', [leaf('base', 'number', ac), leaf('total', 'number', ac)].join(''))
  );

  const hpXml =
    data.hp != null || data.maxHp != null
      ? group(
          'hp',
          [
            leaf('base', 'number', data.maxHp ?? 0),
            leaf('total', 'number', data.maxHp ?? 0),
            leaf('wounds', 'number', Math.max(0, (data.maxHp ?? 0) - (data.hp ?? 0))),
          ].join('')
        )
      : '';

  const speedNum = movementRates.base;
  const speedXml =
    speedNum != null ? group('speed', [leaf('base', 'number', speedNum), leaf('total', 'number', speedNum)].join('')) : '';

  const classesXml = idList('classes', [
    [
      leaf('name', 'string', data.class ?? ''),
      leaf('level', 'number', data.level ?? 1),
      data.xpNeededForNextLevel != null ? leaf('expneeded', 'number', data.xpNeededForNextLevel as number) : '',
    ].join(''),
  ]);

  // Single shared list, confirmed — see file header. The one populated real
  // example seen so far held a racial combat-bonus note, not a weapon name,
  // so this weapon-names guess is unconfirmed either way — kept as the best
  // available option pending a sample that actually exercises it.
  const proficiencyEntries = [
    ...weaponAttacks.map((row) => row.weapon as string | undefined).filter((w): w is string => !!w),
    ...(gameSystem === 'ADD2E' ? nonWeaponProficiencies : []),
  ];
  const proficiencyListXml = idList(
    'proficiencylist',
    proficiencyEntries.map((p) => leaf('name', 'string', p))
  );

  // Not a dedicated "thiefskilllist" — that tag doesn't exist. Thief skills share
  // the same generic <skilllist> this ruleset uses for any proficiency-derived
  // skill check, with a <total> field (confirmed via a real export), not <percent>.
  const thiefSkillsXml = idList(
    'skilllist',
    Object.entries(thiefSkills).map(([key, value]) =>
      [leaf('name', 'string', THIEF_SKILL_LABELS[key] ?? key), leaf('total', 'number', value)].join('')
    )
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

  // Confirmed real structure (Adran Holimion sample): attackbonus/carried/
  // damagelist (one dice entry with an optional bonus)/name. attackbonus is
  // derived as the character's base THAC0 minus the weapon row's own THAC0
  // (a positive value means this weapon attacks better than base) since
  // RoleVerse tracks an absolute per-weapon THAC0, not a relative bonus.
  const weaponlistXml = idList(
    'weaponlist',
    weaponAttacks.map((w) => {
      const name = w.weapon as string | undefined;
      if (!name) return '';
      const weaponThac0 = w.thac0 as number | undefined;
      const attackBonus = weaponThac0 != null ? baseThac0 - weaponThac0 : 0;
      const { dice, bonus } = firstDiceAndBonus(w.damage as string | undefined);
      const damagelist = dice
        ? group(
            'damagelist',
            group('id-00001', [diceLeaf('dice', dice), bonus ? leaf('bonus', 'number', bonus) : ''].join(''))
          )
        : '';
      return [
        leaf('name', 'string', name),
        leaf('attackbonus', 'number', attackBonus),
        leaf('carried', 'number', 1),
        damagelist,
      ].join('');
    })
  );

  // Confirmed real structure: 6 named slots (PP/GP/EP/SP/CP/unnamed).
  // RoleVerse's `treasure` only tracks platinum/gold/silver, so only
  // slots 1/2/4 are populated — no electrum/copper source data.
  const coinsXml = group(
    'coins',
    [
      treasure.platinum != null
        ? group('slot1', [leaf('amount', 'number', treasure.platinum), leaf('name', 'string', 'PP')].join(''))
        : '',
      treasure.gold != null
        ? group('slot2', [leaf('amount', 'number', treasure.gold), leaf('name', 'string', 'GP')].join(''))
        : '',
      treasure.silver != null
        ? group('slot4', [leaf('amount', 'number', treasure.silver), leaf('name', 'string', 'SP')].join(''))
        : '',
    ].join('')
  );

  const encumbranceXml =
    data.encumbrance != null ? group('encumbrance', leaf('load', 'number', data.encumbrance as number)) : '';

  // Sub-tag naming (spellslotsN, not levelN) confirmed via a real DCC export's
  // <powermeta><spellslots1><max>... structure — same CoreRPG-derived convention.
  const spellSlotsXml = group(
    'powermeta',
    Object.entries(spellSlots)
      .map(([lvl, count]) => group(`spellslots${lvl}`, leaf('max', 'number', count)))
      .join('')
  );

  // Whatever sub-keys ABILITY_ADJUSTMENT_FIELDS didn't map to a real tag
  // (e.g. Intelligence's min/max spells per level) still has no confirmed
  // home and goes into notes, same reasoning as the file header's AC-breakdown note.
  const remainingAdjustmentsNote = adjustmentGroups
    .map(([tag, label, values]) => {
      if (!values) return null;
      const consumedKeys = new Set((ABILITY_ADJUSTMENT_FIELDS[tag] ?? []).map((f) => f.subKey));
      const remaining = Object.entries(values).filter(([k]) => !consumedKeys.has(k));
      if (remaining.length === 0) return null;
      return `${label}: ${remaining.map(([k, v]) => `${k} ${v}`).join(', ')}`;
    })
    .filter((line): line is string => line != null)
    .join('\n');

  const identityLine = [
    data.playersName ? `Player's Name: ${data.playersName}` : null,
    data.homeland ? `Homeland: ${data.homeland}` : null,
    data.clan ? `Clan: ${data.clan}` : null,
    data.liege ? `Liege: ${data.liege}` : null,
    data.deity ? `Deity: ${data.deity}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const movementLine =
    Object.keys(movementRates).length > 0
      ? `Movement Rates: ${Object.entries(movementRates)
          .map(([k, v]) => `${k} ${v}`)
          .join(', ')}`
      : null;
  const acBreakdownLine =
    Object.keys(acBreakdown).length > 0
      ? `AC Breakdown: ${Object.entries(acBreakdown)
          .map(([k, v]) => `${k} ${v}`)
          .join(', ')}`
      : null;
  const turnUndeadLine =
    Object.keys(turnUndeadTable).length > 0
      ? `Turn Undead: ${Object.entries(turnUndeadTable)
          .map(([k, v]) => `${k} ${v}`)
          .join(', ')}`
      : null;
  // Only the columns weaponlist has no real field for — name/damage/THAC0
  // are now covered by weaponlistXml above, so this stays much shorter than
  // before rather than duplicating them.
  const weaponDetailLines =
    weaponAttacks.length > 0
      ? [
          'Weapon Notes:',
          ...weaponAttacks
            .filter((w) => w.proficiency || w.attackRate || w.range || w.special)
            .map(
              (w) =>
                `  - ${w.weapon ?? 'Unknown'}: proficiency ${w.proficiency ?? '—'}, attack rate ${w.attackRate ?? '—'}, range ${w.range ?? '—'}${w.special ? `, special: ${w.special}` : ''}`
            ),
        ]
      : [];
  const animalCompanionLines =
    animalCompanions.length > 0
      ? [
          'Animal Companions:',
          ...animalCompanions.map(
            (a) =>
              `  - ${a.name ?? 'Unknown'}: HP ${a.hp ?? '—'}, THAC0 ${a.thac0 ?? '—'}, # Attacks ${a.attacks ?? '—'}, damage ${a.damage ?? '—'}, AC ${a.ac ?? '—'}${a.abilities ? `, abilities: ${a.abilities}` : ''}`
          ),
        ]
      : [];

  const notesParts = [
    ...(identityLine ? [identityLine] : []),
    ...(remainingAdjustmentsNote ? [`Ability Adjustments (no confirmed FG field):\n${remainingAdjustmentsNote}`] : []),
    ...(classAbilities.length > 0 ? [`Class & Racial Abilities: ${classAbilities.join('; ')}`] : []),
    ...(movementLine ? [movementLine] : []),
    ...(acBreakdownLine ? [acBreakdownLine] : []),
    ...(data.encounterSpeed != null ? [`Encounter Speed: ${data.encounterSpeed}`] : []),
    ...(turnUndeadLine ? [turnUndeadLine] : []),
    ...weaponDetailLines,
    ...animalCompanionLines,
  ];
  const notesXml = notesParts.length > 0 ? leaf('notes', 'string', notesParts.join('\n')) : '';

  const inner = [
    leaf('name', 'string', data.name ?? ''),
    leaf('race', 'string', data.race ?? ''),
    leaf('alignment', 'string', (data.alignment as string) ?? ''),
    leaf('exp', 'number', (data.experiencePoints as number) ?? 0),
    leaf('ac', 'number', ac),
    leaf('thaco', 'number', baseThac0),
    (data.numberOfAttacks as string) ? leaf('numberattacks', 'string', data.numberOfAttacks as string) : '',
    abilitiesXml,
    savesXml,
    combatXml,
    defensesXml,
    hpXml,
    speedXml,
    classesXml,
    proficiencyListXml,
    thiefSkillsXml,
    languagelistXml,
    inventorylistXml,
    weaponlistXml,
    coinsXml,
    encumbranceXml,
    spellSlotsXml,
    notesXml,
  ].join('');

  return characterDocument(inner, '35|2E:37|CoreRPG:7');
}
