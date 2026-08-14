// lib/character/export/fantasy-grounds/add.ts
// Shared exporter for ADD1E and ADD2E, targeting Fantasy Grounds' built-in, free,
// WotC-licensed "D&D Classics" 2E ruleset — confirmed to explicitly support both
// 1E and 2E play, with OSRIC (the same OGL retro-clone this project already uses
// for RAG) running on top of it as authorized FG Forge content.
//
// Verified 2026-08-13 in two passes against real Fantasy Grounds campaign data:
// first an unconfigured/blank 2E character record, then the same record after
// the character was given a name, confirming which fields only appear once populated.
//
// Confirmed from the blank record:
//   - THAC0 lives under <combat><thaco> (not a flat <thac0> — note the spelling,
//     no "0"), AC lives under <defenses><ac><total> (not under <combat> at all).
//   - There are 10 individual save categories (paralyzation/poison/death/rod/
//     staff/wand/petrification/polymorph/breath/spell), not 5 combined ones —
//     RoleVerse only stores one number per broad OSRIC-style category, so each
//     is fanned out to its FG sub-categories (they share the same target number
//     within a category, which is exactly why OSRIC groups them that way).
//   - Ability score nodes have no generic modifier — real AD&D 2E derived stats
//     are specific named per-ability fields (hitadj, dmgadj, systemshock, etc.)
//     that FG's own ruleset computes via lookup tables, not simple math. Rather
//     than guess a table (DCC's export burned us on exactly this — 15 gave a
//     bonus of 1, not the +2 a naive guess produced), we only emit score/total
//     and let FG compute the rest.
//   - <classes> is an id-list (name/level per entry), matching the same pattern
//     independently confirmed for both 5E and DCC — not a flat <class> string.
//
// Confirmed from the populated pass (a character named "Enos"):
//   - <name type="string"> is real and top-level, as guessed.
//   - Proficiencies are NOT two separate lists as originally written — it's a
//     single shared <proficiencylist> (entries not yet observed populated, so
//     we can't confirm how weapon vs. non-weapon is distinguished within it)
//     plus a separate <proficiencies><weapon>/<nonweapon> max/used slot-count
//     tracker RoleVerse has no source data for and doesn't try to populate.
//   - <race> has NO plain-text sibling next to <racelink> — this ruleset only
//     exposes race via the reference-database link, which RoleVerse can't
//     populate (no matching reference record to point to). We still emit a
//     plain <race> leaf on the chance FG tolerates/uses it, but ALSO fold race
//     into <notes> so it's visible somewhere even if the dedicated node isn't.
//   - <powermeta> spell slots go up to spellslots9 (not just DCC's 5), and the
//     "spellslotsN not levelN" naming fix made after the DCC sample is now
//     directly confirmed for this ruleset too, not just inferred cross-ruleset.
//   - <featurelist> and <traitlist> both exist as separate real containers
//     (still empty/unpopulated) — which one (if either) RoleVerse's
//     classAbilities should target is still unclear without a populated
//     example of either, so that stays folded into notes rather than guessed.
//
// Confirmed from a real standalone single-character export ("Enos.xml", via
// the sheet's own export-arrow/`/exportchar`, not just a campaign db.xml —
// this is the actual file format a player would import):
//   - The envelope shape (`<root><character>...`) was right, but `version`
//     is "5.1" here, not the "3.3" an older external 5E sample used — see
//     xml.ts's characterDocument doc. `dataversion="20260124"` is also real
//     and now added.
//   - Thief skills do NOT live in a `<thiefskilllist>` — that tag doesn't
//     exist. They're in the SAME generic `<skilllist>` used for any
//     proficiency-derived skill check in this ruleset (a "nonweapon skill"
//     entry was observed there), with a `<total>` field, not `<percent>`.
//   - `<defenses><ac>`, `<hp>`, and `<speed>` each also carry a `<base>`
//     sub-field alongside `<total>` — added here (same value as total, since
//     RoleVerse doesn't separately track base-vs-modified for any of these).
//   - `<proficiencylist>` entries are confirmed single `<name>` leaves,
//     matching what this file already had.
// Still unconfirmed: the disambiguating field (if any) inside
// <proficiencylist> for weapon vs. non-weapon entries.
import type { AssembledCharacterData } from '@/lib/types/character';
import { characterDocument, group, idList, leaf } from './xml';

const ABILITIES: { full: string; tag: string }[] = [
  { full: 'Strength', tag: 'strength' },
  { full: 'Dexterity', tag: 'dexterity' },
  { full: 'Constitution', tag: 'constitution' },
  { full: 'Intelligence', tag: 'intelligence' },
  { full: 'Wisdom', tag: 'wisdom' },
  { full: 'Charisma', tag: 'charisma' },
];

// RoleVerse's broad category -> FG's individual sub-categories sharing that value.
const SAVE_FANOUT: Record<string, string[]> = {
  paralyzation: ['paralyzation', 'poison', 'death'],
  rod: ['rod', 'staff', 'wand'],
  petrification: ['petrification', 'polymorph'],
  breath: ['breath'],
  spell: ['spell'],
};

function firstNumber(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : undefined;
}

export function exportAdd(gameSystem: 'ADD1E' | 'ADD2E', data: AssembledCharacterData, equipment: unknown[]): string {
  const abilityScores = (data.abilityScores as Record<string, number>) ?? {};
  const savingThrows = (data.savingThrows as Record<string, number>) ?? {};
  const weaponProficiencies = (data.weaponProficiencies as string[]) ?? [];
  const nonWeaponProficiencies = (data.nonWeaponProficiencies as string[] | undefined) ?? [];
  const abilityModifiers = (data.abilityModifiers as Record<string, number>) ?? {};
  const classAbilities = (data.classAbilities as string[]) ?? [];
  const thiefSkills = (data.thiefSkills as Record<string, number>) ?? {};
  const languages = (data.languages as string[]) ?? [];
  const spellSlots = (data.spellSlots as Record<string, number>) ?? {};

  const abilitiesXml = group(
    'abilities',
    ABILITIES.map(({ full, tag }) => {
      const score = abilityScores[full];
      if (score == null) return '';
      return group(tag, [leaf('score', 'number', score), leaf('total', 'number', score)].join(''));
    }).join('')
  );

  const savesXml = group(
    'saves',
    Object.entries(SAVE_FANOUT)
      .flatMap(([roleverseKey, fgTags]) => {
        const value = savingThrows[roleverseKey];
        if (value == null) return [];
        return fgTags.map((tag) => group(tag, leaf('total', 'number', value)));
      })
      .join('')
  );

  const combatXml = group('combat', group('thaco', leaf('score', 'number', (data.thac0 as number) ?? 20)));

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

  const speedNum = firstNumber(data.movementRate as string | undefined);
  const speedXml =
    speedNum != null ? group('speed', [leaf('base', 'number', speedNum), leaf('total', 'number', speedNum)].join('')) : '';

  const classesXml = idList('classes', [
    [leaf('name', 'string', data.class ?? ''), leaf('level', 'number', data.level ?? 1)].join(''),
  ]);

  // Single shared list, confirmed — see file header. We can't yet confirm how FG
  // distinguishes weapon vs. non-weapon entries within it, so both land here
  // undifferentiated rather than guessing a "type"/"category" sub-field.
  const proficiencyEntries = [
    ...weaponProficiencies,
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
    Object.entries(thiefSkills).map(([name, value]) =>
      [leaf('name', 'string', name), leaf('total', 'number', value)].join('')
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

  // Sub-tag naming (spellslotsN, not levelN) confirmed via a real DCC export's
  // <powermeta><spellslots1><max>... structure — same CoreRPG-derived convention.
  const spellSlotsXml = group(
    'powermeta',
    Object.entries(spellSlots)
      .map(([lvl, count]) => group(`spellslots${lvl}`, leaf('max', 'number', count)))
      .join('')
  );

  // abilityModifiers (RoleVerse's open name->value list of things like "Str hit: +1")
  // has no clean home — real AD&D 2E derived stats are specific named fields we can't
  // confidently target (see file header), so this goes into notes rather than an
  // invented tag.
  const notesParts = [
    // Confirmed no plain-text race field exists on this ruleset's sheet — see
    // file header. Duplicating it here guarantees it's visible somewhere.
    ...(data.race ? [`Race: ${data.race}`] : []),
    ...(abilityModifiers && Object.keys(abilityModifiers).length > 0
      ? [`Ability Modifiers: ${Object.entries(abilityModifiers).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...(classAbilities.length > 0 ? [`Class & Racial Abilities: ${classAbilities.join('; ')}`] : []),
  ];
  const notesXml = notesParts.length > 0 ? leaf('notes', 'string', notesParts.join('\n')) : '';

  const inner = [
    leaf('name', 'string', data.name ?? ''),
    leaf('race', 'string', data.race ?? ''),
    leaf('alignment', 'string', (data.alignment as string) ?? ''),
    leaf('exp', 'number', (data.experiencePoints as number) ?? 0),
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
    spellSlotsXml,
    notesXml,
  ].join('');

  return characterDocument(inner, '35|2E:37|CoreRPG:7');
}
