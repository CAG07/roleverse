// lib/character/export/fantasy-grounds/dcc.ts
// Real Fantasy Grounds DCC XML export — verified 2026-08-13 against real, populated
// 0-level funnel characters read directly from a live Fantasy Grounds campaign
// ("Tower of the Black Pearl", db.session.<date>.xml), not guessed. This replaces
// an earlier plain-text-only fallback: research had found no public sample DCC
// export anywhere, so the original version deliberately avoided targeting FG's
// XML at all rather than invent field names. A real sample changes that.
//
// Confirmed structure worth noting for future maintenance:
//   - Release string is "23|GGDCCRULESET:3|CoreRPG:7" — ruleset-specific, do not
//     reuse another system's value (see xml.ts's characterDocument doc).
//   - Abilities are keyed by full lowercase name (agility/intelligence/luck/
//     personality/stamina/strength — DCC's own set, not the 5E six), each with
//     score/total. We deliberately do NOT emit a `bonus`/modifier: the sample
//     proved DCC's ability-modifier table isn't the simple 5E floor((score-10)/2)
//     formula (a score of 15 gave a real bonus of 1, not the +2 a naive guess
//     would produce) — FG's own ruleset computes this from score on load, so we
//     leave it to do that rather than risk a wrong value reaching the table.
//   - classes/inventorylist/languagelist/weaponlist are id-list records, same
//     convention confirmed independently for 5E.
//   - Fields with NO populated example in the sample (all four pregens were
//     0-level, so no deed die, backstab, or thief skills were active; no wizard
//     had prepared/known spells structured beyond a bare <powers> id-list whose
//     child shape is far richer than RoleVerse tracks — full casting tables,
//     actions, corruption-per-spell) are intentionally NOT turned into invented
//     XML nodes. They're folded into a plain <notes> field instead, consistent
//     with this project's rule against asserting structure we haven't verified.
import type { AssembledCharacterData } from '@/lib/types/character';
import { characterDocument, diceLeaf, group, idList, leaf } from './xml';

const ABILITIES: { full: string; tag: string }[] = [
  { full: 'Strength', tag: 'strength' },
  { full: 'Agility', tag: 'agility' },
  { full: 'Stamina', tag: 'stamina' },
  { full: 'Personality', tag: 'personality' },
  { full: 'Intelligence', tag: 'intelligence' },
  { full: 'Luck', tag: 'luck' },
];

function dieOnly(damage: string | undefined): string | undefined {
  if (!damage) return undefined;
  const match = damage.match(/d\d+/i);
  return match ? match[0].toLowerCase() : undefined;
}

export function exportDcc(data: AssembledCharacterData, equipment: unknown[]): string {
  const abilityScores = (data.abilityScores as Record<string, number>) ?? {};
  const savingThrows = (data.savingThrows as Record<string, number>) ?? {};
  const languages = (data.languages as string[]) ?? [];
  const weapons =
    (data.weapons as { name: string; attackMod: number; damage: string; notes?: string }[] | undefined) ?? [];
  const corruption = (data.corruption as string[]) ?? [];
  const patronTaint = (data.patronTaint as string[]) ?? [];
  const knownSpells = (data.knownSpells as string[]) ?? [];

  const abilitiesXml = group(
    'abilities',
    ABILITIES.map(({ full, tag }) => {
      const score = abilityScores[full];
      if (score == null) return '';
      const extra =
        tag === 'luck' && (data.startingLuck as string) != null
          ? leaf('starting', 'number', parseInt(data.startingLuck as string, 10) || 0)
          : '';
      return group(tag, [leaf('score', 'number', score), leaf('total', 'number', score), extra].join(''));
    }).join('')
  );

  const classesXml = idList('classes', [
    [leaf('name', 'string', data.class ?? ''), leaf('level', 'number', data.level ?? 0)].join(''),
  ]);

  const defensesXml = group('defenses', group('ac', leaf('total', 'number', (data.ac as number) ?? 10)));

  const hpXml =
    data.hp != null || data.maxHp != null
      ? group(
          'hp',
          [
            leaf('total', 'number', data.maxHp ?? 0),
            leaf('wounds', 'number', Math.max(0, (data.maxHp ?? 0) - (data.hp ?? 0))),
          ].join('')
        )
      : '';

  const initiative = data.initiative as number | undefined;
  const initiativeXml = initiative != null ? group('initiative', leaf('total', 'number', initiative)) : '';

  const speedStr = data.speed as string | undefined;
  const speedNum = speedStr ? parseInt(speedStr, 10) : NaN;
  const speedXml = !Number.isNaN(speedNum)
    ? group('speed', [leaf('base', 'number', speedNum), leaf('total', 'number', speedNum)].join(''))
    : '';

  const savesXml = group(
    'saves',
    (['fortitude', 'reflex', 'willpower'] as const)
      .map((key) => {
        const value = savingThrows[key];
        return value != null ? group(key, leaf('total', 'number', value)) : '';
      })
      .join('')
  );

  const disapprovalXml =
    (data.disapprovalRange as number) != null
      ? group('disapproval', leaf('range', 'number', data.disapprovalRange as number))
      : '';

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

  const weaponlistXml = idList(
    'weaponlist',
    weapons.map((w) => {
      const die = dieOnly(w.damage);
      return [
        leaf('name', 'string', w.name),
        leaf('attackbonus', 'number', w.attackMod ?? 0),
        die ? group('damagelist', group('id-00001', diceLeaf('dice', die))) : '',
      ].join('');
    })
  );

  const notesParts = [
    ...(corruption.length > 0 ? [`Corruption: ${corruption.join('; ')}`] : []),
    ...(patronTaint.length > 0 ? [`Patron Taint: ${patronTaint.join('; ')}`] : []),
    ...((data.mercurialMagic as string) ? [`Mercurial Magic: ${data.mercurialMagic}`] : []),
    ...(knownSpells.length > 0 ? [`Known Spells: ${knownSpells.join(', ')}`] : []),
    ...((data.deedDie as string) ? [`Deed Die: ${data.deedDie}`] : []),
    ...((data.backstab as string) ? [`Backstab: ${data.backstab}`] : []),
    ...(weapons.some((w) => w.notes)
      ? weapons.filter((w) => w.notes).map((w) => `${w.name}: ${w.notes}`)
      : []),
  ];
  const notesXml = notesParts.length > 0 ? leaf('notes', 'string', notesParts.join('\n')) : '';

  const inner = [
    leaf('name', 'string', data.name ?? ''),
    leaf('race', 'string', data.race ?? ''),
    leaf('occupation', 'string', (data.occupation as string) ?? ''),
    leaf('alignment', 'string', (data.alignment as string) ?? ''),
    leaf('level', 'number', data.level ?? 0),
    leaf('actiondice', 'string', '1d20'),
    leaf('exp', 'number', (data.experiencePoints as number) ?? 0),
    abilitiesXml,
    classesXml,
    defensesXml,
    hpXml,
    initiativeXml,
    speedXml,
    savesXml,
    disapprovalXml,
    languagelistXml,
    inventorylistXml,
    weaponlistXml,
    notesXml,
  ].join('');

  return characterDocument(inner, '23|GGDCCRULESET:3|CoreRPG:7');
}
