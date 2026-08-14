// lib/character/export/fantasy-grounds/xml.ts
// Hand-rolled XML string builder for Fantasy Grounds character exports. No XML
// library dependency — FG's own ruleset-dev docs state its file format has no
// XSD/schema ("learned from examples"), so a generic tree serializer would buy
// nothing a handful of small string helpers don't already cover.

export function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** A typed leaf node: <tag type="number">1</tag> or <tag type="string">Foo</tag>. */
export function leaf(tag: string, type: 'number' | 'string', value: string | number): string {
  return `<${tag} type="${type}">${escapeXml(String(value))}</${tag}>`;
}

/** FG's dice-notation type, e.g. <dice type="dice">d8</dice> — confirmed via a real DCC
 *  weapon export to take the die alone ("d8"), not a leading count ("1d8"). */
export function diceLeaf(tag: string, value: string): string {
  return `<${tag} type="dice">${escapeXml(value)}</${tag}>`;
}

/** An untyped wrapper node containing other nodes: <tag>...</tag>. Empty inner content is skipped. */
export function group(tag: string, inner: string): string {
  if (!inner) return '';
  return `<${tag}>${inner}</${tag}>`;
}

/**
 * FG's convention for repeated records (skilllist, inventorylist, languagelist,
 * classes, featlist, ...): each entry keyed by a 1-based zero-padded id, e.g.
 * id-00001, id-00002. Entries with no content are dropped.
 */
export function idList(tag: string, entries: string[]): string {
  const nonEmpty = entries.filter(Boolean);
  if (nonEmpty.length === 0) return '';
  const items = nonEmpty
    .map((inner, i) => group(`id-${String(i + 1).padStart(5, '0')}`, inner))
    .join('');
  return group(tag, items);
}

/** Wraps a character record in FG's standalone single-character export envelope
 *  — confirmed 2026-08-13 against a real `/exportchar`/export-arrow single-character
 *  file (AD&D 2E, "Enos.xml"), not just a campaign db.xml: the envelope shape
 *  (`<root><character>...`) matches what was already assumed, but `version` and
 *  `dataversion` are real, install-wide constants, not ruleset-specific — confirmed
 *  identical ("5.1"/"20260124") across two independently-checked rulesets (AD&D 2E
 *  and, from the earlier DCC campaign file, DCC too) on the same Fantasy Grounds
 *  install. `release` IS ruleset-specific — confirmed values: AD&D 2E/"D&D Classics"
 *  is "35|2E:37|CoreRPG:7", DCC is "23|GGDCCRULESET:3|CoreRPG:7". 5E's "8|CoreRPG:3"
 *  and the document `version` that went with it came from an external, older
 *  third-party sample (not this install) — worth rechecking against a real 5E
 *  export if one ever surfaces, since "3.3" doesn't match the "5.1" confirmed twice
 *  here and may just reflect an older Fantasy Grounds release. */
export function characterDocument(inner: string, release: string): string {
  return (
    '<?xml version="1.0" encoding="iso-8859-1"?>\n' +
    `<root version="5.1" dataversion="20260124" release="${escapeXml(release)}">${group('character', inner)}</root>`
  );
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Best-effort proficiency check against a freeform proficiency-list string field —
 *  RoleVerse stores these as player-typed text (e.g. "Strength, Constitution"), not
 *  a structured flag set, so this is a case-insensitive substring match rather than
 *  a guaranteed-accurate lookup. */
export function mentionedIn(list: string[] | undefined, name: string): boolean {
  if (!list || list.length === 0) return false;
  const needle = name.toLowerCase();
  return list.some((entry) => entry.toLowerCase().includes(needle));
}
