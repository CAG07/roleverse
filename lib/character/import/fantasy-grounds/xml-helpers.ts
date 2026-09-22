// lib/character/import/fantasy-grounds/xml-helpers.ts
// Small DOM-walking helpers shared by every per-system Fantasy Grounds XML
// importer (parse-add.ts, parse-dnd5e.ts, parse-pf2e.ts). Browser-only
// (DOMParser) — no XML library dependency, matching the export side's own
// "no XML library" precedent (lib/character/export/fantasy-grounds/xml.ts).
// Extracted from parse-add.ts, the first of these parsers, so the other two
// don't each redefine the same four functions.

export function child(parent: Element | null, tag: string): Element | null {
  if (!parent) return null;
  for (const c of Array.from(parent.children)) {
    if (c.tagName === tag) return c;
  }
  return null;
}

export function childText(parent: Element | null, tag: string): string {
  return child(parent, tag)?.textContent?.trim() ?? '';
}

export function childNumber(parent: Element | null, tag: string): number | undefined {
  const t = childText(parent, tag);
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function idListChildren(parent: Element | null): Element[] {
  if (!parent) return [];
  return Array.from(parent.children).filter((c) => /^id-\d+$/.test(c.tagName));
}

export interface ParsedFGDocument {
  charEl: Element;
}

/** Parses raw XML text into the <character> element, or an error message
 *  suitable to show the player directly. Shared entry point so every
 *  per-system parser reports the same "not a real export" cases the same way. */
export function parseFGCharacterElement(xmlText: string): Element | { error: string } {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  } catch {
    return { error: 'Could not parse this file as XML.' };
  }
  if (doc.querySelector('parsererror')) {
    return { error: 'Could not parse this file as XML — it may be corrupted or not a valid export.' };
  }
  const charEl = doc.querySelector('character');
  if (!charEl) {
    return { error: 'This does not look like a Fantasy Grounds character export (no <character> element found).' };
  }
  return charEl;
}
