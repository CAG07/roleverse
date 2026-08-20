// lib/character/export/fantasy-grounds/cyberpunk2020.ts
// Generic CoreRPG-convention export for Cyberpunk 2020 — no real FG CP2020
// ruleset sample exists to verify against, and this is a proprietary
// R. Talsorian-licensed game with no OGL/SRD at all. Uses the confirmed
// cross-ruleset shapes (name, inventorylist, skilllist) where they plausibly
// apply, folds everything CP2020-specific (the 9 STATs, Humanity, wounds,
// weapons/armor tables) into <notes>.
import type { AssembledCharacterData } from '@/lib/types/character';
import { characterDocument, group, idList, leaf } from './xml';

const STATS = [
  'Intelligence',
  'Reflexes',
  'Cool',
  'Technical',
  'Luck',
  'Attractiveness',
  'Movement',
  'Body',
  'Empathy',
];

export function exportCyberpunk2020(data: AssembledCharacterData, equipment: unknown[]): string {
  const abilityScores = (data.abilityScores as Record<string, number>) ?? {};
  const skills = (data.skills as Record<string, number> | undefined) ?? {};
  const humanity = (data.humanity as Record<string, number> | undefined) ?? {};
  const move = (data.move as Record<string, number> | undefined) ?? {};
  const armor = (data.armor as Record<string, unknown>[] | undefined) ?? [];
  const weapons = (data.weapons as Record<string, unknown>[] | undefined) ?? [];
  const cyberware = (data.cyberware as string[] | undefined) ?? [];
  const netrunningPrograms = (data.netrunningPrograms as string[] | undefined) ?? [];

  const statsXml = group(
    'abilities',
    STATS.map((stat) => {
      const score = abilityScores[stat];
      if (score == null) return '';
      return group(stat.toLowerCase(), leaf('total', 'number', score));
    }).join('')
  );

  const skilllistXml = idList(
    'skilllist',
    Object.entries(skills).map(([name, total]) => [leaf('name', 'string', name), leaf('total', 'number', total)].join(''))
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

  const notesParts = [
    ...((data.realName as string) ? [`Real Name: ${data.realName}`] : []),
    ...(Object.keys(humanity).length > 0
      ? [`Humanity: ${Object.entries(humanity).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...(Object.keys(move).length > 0 ? [`Move: ${Object.entries(move).map(([k, v]) => `${k} ${v}`).join(', ')}`] : []),
    ...(data.saveNumber != null ? [`Save: ${data.saveNumber}`] : []),
    ...(data.currentWounds != null ? [`Current Wounds: ${data.currentWounds}`] : []),
    ...((data.woundStatus as string) ? [`Wound Status: ${data.woundStatus}`] : []),
    ...(armor.length > 0
      ? ['Armor:', ...armor.map((a) => `  - ${a.location ?? 'Unknown'}: SP ${a.sp ?? '—'}${a.notes ? ` (${a.notes})` : ''}`)]
      : []),
    ...(weapons.length > 0
      ? [
          'Weapons:',
          ...weapons.map(
            (w) => `  - ${w.name ?? 'Unknown'} (${w.type ?? '—'}): ${w.damage ?? '—'} damage, ROF ${w.rateOfFire ?? '—'}, ${w.shots ?? '—'} shots`
          ),
        ]
      : []),
    ...(cyberware.length > 0 ? [`Cyberware: ${cyberware.join('; ')}`] : []),
    ...(netrunningPrograms.length > 0 ? [`Netrunning Programs: ${netrunningPrograms.join('; ')}`] : []),
    ...(data.interfaceRating != null ? [`Interface Rating: ${data.interfaceRating}`] : []),
    ...((data.lifestyle as string) ? [`Lifestyle: ${data.lifestyle}`] : []),
    ...(data.eurodollars != null ? [`Eurodollars: ${data.eurodollars}`] : []),
    ...(data.improvementPoints != null ? [`Improvement Points: ${data.improvementPoints}`] : []),
    ...(data.reputation != null ? [`Reputation: ${data.reputation}`] : []),
    ...((data.friendsFamilyEnemiesLovers as string)
      ? [`Friends, Family, Enemies & Lovers: ${data.friendsFamilyEnemiesLovers}`]
      : []),
    ...((data.background as string) ? [`Background: ${data.background}`] : []),
  ];
  const notesXml = notesParts.length > 0 ? leaf('notes', 'string', notesParts.join('\n')) : '';

  const inner = [
    leaf('name', 'string', data.name ?? ''),
    leaf('class', 'string', data.class ?? ''),
    statsXml,
    hpXml,
    skilllistXml,
    inventorylistXml,
    notesXml,
  ].join('');

  // Fully unconfirmed release string — no known official FG CP2020 ruleset to
  // check against. Best-effort placeholder only.
  return characterDocument(inner, 'CP2020:1|CoreRPG:3');
}
