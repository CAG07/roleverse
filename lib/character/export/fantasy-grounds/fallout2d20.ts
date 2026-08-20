// lib/character/export/fantasy-grounds/fallout2d20.ts
// Generic CoreRPG-convention export for Fallout 2d20 — brand-new system added
// to RoleVerse this pass, no real FG ruleset sample exists to verify against,
// and this is a proprietary Modiphius/Bethesda-licensed game with no OGL/SRD
// at all. Uses the confirmed cross-ruleset shapes (name, abilities, hp,
// skilllist, inventorylist) where they plausibly apply — S.P.E.C.I.A.L.
// scores are used directly in this system (no D&D-style modifier formula),
// so no `bonus` is emitted, same reasoning as DCC/TOR2E. Everything
// Fallout-specific (Defense, AP, Luck, Radiation, damage resistance, Perks)
// folds into <notes>.
import type { AssembledCharacterData } from '@/lib/types/character';
import { characterDocument, group, idList, leaf } from './xml';

const SPECIAL = ['Strength', 'Perception', 'Endurance', 'Charisma', 'Intelligence', 'Agility', 'Luck'];

export function exportFallout2d20(data: AssembledCharacterData, equipment: unknown[]): string {
  const abilityScores = (data.abilityScores as Record<string, number>) ?? {};
  const skills = (data.skills as Record<string, number> | undefined) ?? {};
  const tagSkills = (data.tagSkills as string[] | undefined) ?? [];
  const perks = (data.perks as string[] | undefined) ?? [];
  const traits = (data.traits as string[] | undefined) ?? [];
  const addiction = (data.addiction as string[] | undefined) ?? [];
  const luckPoints = (data.luckPoints as Record<string, number> | undefined) ?? {};
  const damageResistance = (data.damageResistance as Record<string, number> | undefined) ?? {};
  const radiation = (data.radiation as Record<string, number> | undefined) ?? {};
  const weapons = (data.weapons as Record<string, unknown>[] | undefined) ?? [];
  const armor = (data.armor as Record<string, unknown>[] | undefined) ?? [];
  const factionReputation = (data.factionReputation as Record<string, number> | undefined) ?? {};

  const specialXml = group(
    'abilities',
    SPECIAL.map((stat) => {
      const score = abilityScores[stat];
      if (score == null) return '';
      return group(stat.toLowerCase(), leaf('total', 'number', score));
    }).join('')
  );

  const acTotal = (data.defense as number) ?? 10;
  const defensesXml = group('defenses', group('ac', leaf('total', 'number', acTotal)));

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

  const notesParts = [
    ...((data.origin as string) ? [`Origin: ${data.origin}`] : []),
    ...(data.actionPoints != null ? [`Action Points: ${data.actionPoints}`] : []),
    ...(Object.keys(luckPoints).length > 0
      ? [`Luck Points: ${Object.entries(luckPoints).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...(Object.keys(damageResistance).length > 0
      ? [`Damage Resistance: ${Object.entries(damageResistance).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...(Object.keys(radiation).length > 0
      ? [`Radiation: ${Object.entries(radiation).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...(tagSkills.length > 0 ? [`Tag Skills: ${tagSkills.join(', ')}`] : []),
    ...(perks.length > 0 ? [`Perks: ${perks.join('; ')}`] : []),
    ...(traits.length > 0 ? [`Traits: ${traits.join('; ')}`] : []),
    ...(addiction.length > 0 ? [`Addiction: ${addiction.join('; ')}`] : []),
    ...((data.karma as string) ? [`Karma: ${data.karma}`] : []),
    ...(data.caps != null ? [`Caps: ${data.caps}`] : []),
    ...(weapons.length > 0
      ? ['Weapons:', ...weapons.map((w) => `  - ${w.name ?? 'Unknown'}: ${w.damage ?? '—'} damage, range ${w.range ?? '—'}`)]
      : []),
    ...(armor.length > 0
      ? ['Armor:', ...armor.map((a) => `  - ${a.location ?? 'Unknown'}: DR ${a.damageResistance ?? '—'}`)]
      : []),
    ...(Object.keys(factionReputation).length > 0
      ? [`Faction Reputation: ${Object.entries(factionReputation).map(([k, v]) => `${k} ${v}`).join(', ')}`]
      : []),
    ...((data.companion as string) ? [`Companion: ${data.companion}`] : []),
    ...((data.background as string) ? [`Background: ${data.background}`] : []),
  ];
  const notesXml = notesParts.length > 0 ? leaf('notes', 'string', notesParts.join('\n')) : '';

  const inner = [
    leaf('name', 'string', data.name ?? ''),
    specialXml,
    defensesXml,
    hpXml,
    skilllistXml,
    inventorylistXml,
    notesXml,
  ].join('');

  // Fully unconfirmed release string — no known official FG Fallout 2d20
  // ruleset to check against. Best-effort placeholder only.
  return characterDocument(inner, 'FALLOUT2D20:1|CoreRPG:3');
}
