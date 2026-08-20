// lib/character/export/fantasy-grounds/tor2e.ts
// Generic CoreRPG-convention export for The One Ring 2E — no real FG TOR2E
// ruleset sample exists to verify against (Free League games have much
// thinner official FG support than the D&D-family rulesets this project has
// verified elsewhere). Unlike the D&D-family exporters, TOR2E's Strength/
// Heart/Wits ratings are used directly (no ability-modifier formula), so no
// `bonus` is emitted — same "don't guess a derivation with nothing to check
// it against" reasoning as DCC's ability scores. Only `name`, the three
// attributes, and inventory use CoreRPG-standard tag names; everything else
// (Endurance/Hope/Shadow, skills, combat proficiencies, war gear stats) folds
// into <notes> since this ruleset's real FG shape is entirely unconfirmed.
import type { AssembledCharacterData } from '@/lib/types/character';
import { characterDocument, group, idList, leaf } from './xml';

const ATTRIBUTES: { full: string; tag: string }[] = [
  { full: 'Strength', tag: 'strength' },
  { full: 'Heart', tag: 'heart' },
  { full: 'Wits', tag: 'wits' },
];

export function exportTor2e(data: AssembledCharacterData, equipment: unknown[]): string {
  const abilityScores = (data.abilityScores as Record<string, number>) ?? {};
  const targetNumbers = (data.targetNumbers as Record<string, number> | undefined) ?? {};
  const endurance = (data.endurance as Record<string, number> | undefined) ?? {};
  const hope = (data.hope as Record<string, number> | undefined) ?? {};
  const skills = (data.skills as Record<string, number> | undefined) ?? {};
  const combatProficiencies = (data.combatProficiencies as Record<string, number> | undefined) ?? {};
  const rewards = (data.rewards as Record<string, number> | undefined) ?? {};
  const conditions = (data.conditions as string[] | undefined) ?? [];
  const warGear = (data.warGear as Record<string, unknown>[] | undefined) ?? [];
  const armourAndHelm = (data.armourAndHelm as Record<string, unknown>[] | undefined) ?? [];
  const shield = (data.shield as Record<string, number> | undefined) ?? {};

  const attributesXml = group(
    'abilities',
    ATTRIBUTES.map(({ full, tag }) => {
      const score = abilityScores[full];
      if (score == null) return '';
      const tn = targetNumbers[full.toLowerCase()];
      return group(
        tag,
        [leaf('score', 'number', score), leaf('total', 'number', score), tn != null ? leaf('tn', 'number', tn) : ''].join('')
      );
    }).join('')
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

  const inventorylistXml = idList(
    'inventorylist',
    equipment.map((raw) => {
      const r = (raw && typeof raw === 'object' ? raw : { name: String(raw) }) as Record<string, unknown>;
      const name = (r.name as string) ?? (r.item as string) ?? 'Unknown item';
      const count = (r.quantity as number) ?? (r.qty as number) ?? (r.count as number) ?? 1;
      return [leaf('name', 'string', name), leaf('count', 'number', count)].join('');
    })
  );

  const notesParts = [
    ...((data.heroicCulture as string) ? [`Heroic Culture: ${data.heroicCulture}`] : []),
    ...((data.culturalBlessing as string) ? [`Cultural Blessing: ${data.culturalBlessing}`] : []),
    ...((data.standardOfLiving as string) ? [`Standard of Living: ${data.standardOfLiving}`] : []),
    ...((data.calling as string) ? [`Calling: ${data.calling}`] : []),
    ...((data.shadowPath as string) ? [`Shadow Path: ${data.shadowPath}`] : []),
    ...((data.patron as string) ? [`Patron: ${data.patron}`] : []),
    ...((data.distinctiveFeatures as string) ? [`Distinctive Features: ${data.distinctiveFeatures}`] : []),
    ...((data.flaws as string) ? [`Flaws: ${data.flaws}`] : []),
    ...(Object.keys(rewards).length > 0
      ? [`Rewards: ${Object.entries(rewards).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...(data.valour != null ? [`Valour: ${data.valour}`] : []),
    ...(data.wisdom != null ? [`Wisdom: ${data.wisdom}`] : []),
    ...(Object.keys(endurance).length > 0
      ? [`Endurance: ${Object.entries(endurance).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...(Object.keys(hope).length > 0 ? [`Hope: ${Object.entries(hope).map(([k, v]) => `${k} ${v}`).join(', ')}`] : []),
    ...(conditions.length > 0 ? [`Conditions: ${conditions.join(', ')}`] : []),
    ...((data.injury as string) ? [`Injury: ${data.injury}`] : []),
    ...(Object.keys(combatProficiencies).length > 0
      ? [`Combat Proficiencies: ${Object.entries(combatProficiencies).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...(Object.keys(skills).length > 0
      ? [`Skills: ${Object.entries(skills).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...(warGear.length > 0
      ? ['War Gear:', ...warGear.map((w) => `  - ${w.weapon ?? 'Unknown'}: damage ${w.damage ?? '—'}, injury ${w.injury ?? '—'}, load ${w.load ?? '—'}`)]
      : []),
    ...(armourAndHelm.length > 0
      ? ['Armour & Helm:', ...armourAndHelm.map((a) => `  - ${a.item ?? 'Unknown'}: protection ${a.protection ?? '—'}, load ${a.load ?? '—'}`)]
      : []),
    ...(Object.keys(shield).length > 0
      ? [`Shield: ${Object.entries(shield).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...(data.treasure != null ? [`Treasure: ${data.treasure}`] : []),
    ...((data.history as string) ? [`History: ${data.history}`] : []),
  ];
  const notesXml = notesParts.length > 0 ? leaf('notes', 'string', notesParts.join('\n')) : '';

  const inner = [
    leaf('name', 'string', data.name ?? ''),
    leaf('age', 'string', (data.age as string) ?? ''),
    attributesXml,
    hpXml,
    inventorylistXml,
    notesXml,
  ].join('');

  // Fully unconfirmed release string — TOR2E has no known official FG ruleset
  // to check against at all. Best-effort placeholder only.
  return characterDocument(inner, 'TOR2E:1|CoreRPG:3');
}
