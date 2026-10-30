// lib/character/fantasy-grounds-encoding.ts
// Fantasy Grounds character files declare encoding="iso-8859-1" (Latin-1), but
// browsers write a string Blob as UTF-8 and read File.text() as UTF-8. Either
// mismatch garbles any non-ASCII character: an em dash written as UTF-8 shows
// up in FG as "â€”", and an "é" in a real FG export reads back as "�". Text
// RoleVerse generates is full of these (— – ‘ ’ “ ” …), so both directions go
// through the helpers here.

/** Typographic punctuation outside Latin-1, folded to plain ASCII FG shows cleanly. */
const ASCII_FOLDS: Record<string, string> = {
  '\u2010': '-', // hyphen
  '\u2011': '-', // non-breaking hyphen
  '\u2012': '-', // figure dash
  '\u2013': '-', // en dash
  '\u2014': '-', // em dash
  '\u2015': '-', // horizontal bar
  '\u2212': '-', // minus sign
  '\u2018': "'",
  '\u2019': "'",
  '\u201A': "'",
  '\u201B': "'",
  '\u2032': "'", // prime
  '\u201C': '"',
  '\u201D': '"',
  '\u201E': '"',
  '\u201F': '"',
  '\u2033': '"', // double prime
  '\u2026': '...',
  '\u2022': '*', // bullet
  '\u2002': ' ',
  '\u2003': ' ',
  '\u2009': ' ',
  '\u200A': ' ',
  '\u202F': ' ',
  '\u200B': '', // zero-width space
  '\uFEFF': '', // byte order mark / zero-width no-break space
};

const FOLD_PATTERN = new RegExp(`[${Object.keys(ASCII_FOLDS).join('')}]`, 'g');

/**
 * Folds typographic punctuation outside Latin-1 to plain ASCII. Run this on raw
 * text before XML-escaping, since curly quotes fold to characters that need it.
 */
export function foldTypography(text: string): string {
  return text.replace(FOLD_PATTERN, (ch) => ASCII_FOLDS[ch]);
}

/**
 * Writes any character above U+00FF as a numeric character reference
 * (&#8364;) so it survives a Latin-1 document instead of being lost. Run this
 * after XML-escaping, or the escaping would mangle the "&" it adds.
 */
export function toLatin1Xml(escapedText: string): string {
  let out = '';
  for (const ch of escapedText) {
    const code = ch.codePointAt(0)!;
    out += code > 0xff ? `&#${code};` : ch;
  }
  return out;
}

/**
 * Encodes a string as Latin-1 bytes for download. Every character should
 * already be at or below U+00FF (see toLatin1Xml); anything else becomes "?"
 * rather than a wrong byte.
 */
export function encodeLatin1(text: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes[i] = code > 0xff ? 0x3f : code;
  }
  return bytes;
}

/**
 * Decodes an uploaded XML file using the encoding its own prolog declares
 * (<?xml ... encoding="iso-8859-1"?>), preserving valid UTF-8 from older
 * RoleVerse exports that used that declaration. The prolog is plain ASCII in
 * every encoding FG uses, so it can be read before decoding.
 */
export function decodeXmlBytes(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const head = String.fromCharCode(...view.subarray(0, 200));
  const declared = /<\?xml[^>]*\bencoding\s*=\s*["']([A-Za-z0-9._-]+)["']/i.exec(head)?.[1];
  if (declared && /^(?:iso-8859-1|latin-?1|windows-1252|cp1252)$/i.test(declared)) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(view);
    } catch {
      // Older RoleVerse exports declared Latin-1 despite containing UTF-8 bytes.
    }
  }
  try {
    return new TextDecoder(declared ?? 'utf-8').decode(view);
  } catch {
    // Unknown encoding label: UTF-8 is the XML default.
    return new TextDecoder('utf-8').decode(view);
  }
}
