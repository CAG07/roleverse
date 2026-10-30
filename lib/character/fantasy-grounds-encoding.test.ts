import { describe, expect, it } from 'vitest';
import {
  decodeXmlBytes,
  encodeLatin1,
  foldTypography,
  toLatin1Xml,
} from './fantasy-grounds-encoding';
import { characterDocument, leaf } from './export/fantasy-grounds/xml';

describe('foldTypography', () => {
  it('folds typographic punctuation to ASCII', () => {
    expect(foldTypography('Sword — “Dawnbringer” – it’s… sharp')).toBe(
      'Sword - "Dawnbringer" - it\'s... sharp'
    );
  });
});

describe('toLatin1Xml', () => {
  it('keeps Latin-1 characters as they are', () => {
    expect(toLatin1Xml('Élan café ×2 ½')).toBe('Élan café ×2 ½');
  });

  it('writes other characters as numeric references', () => {
    expect(toLatin1Xml('Cost: 5€ 🐉')).toBe('Cost: 5&#8364; &#128009;');
  });
});

describe('Fantasy Grounds XML round trip', () => {
  it('produces a document whose bytes decode back to the same text', () => {
    const xml = characterDocument(leaf('notes', 'string', 'Half-elf — “bard” from Faerûn'), 'test');
    const bytes = encodeLatin1(xml);

    // Every character fits in one Latin-1 byte, so encodeLatin1 had nothing to replace.
    expect([...xml].every((ch) => ch.charCodeAt(0) <= 0xff)).toBe(true);

    const decoded = decodeXmlBytes(bytes);
    expect(decoded).toBe(xml);
    expect(decoded).toContain('Half-elf - &quot;bard&quot; from Faerûn');
  });

  it('escapes curly quotes that fold to a double quote inside attributes', () => {
    const xml = characterDocument('', 'v“1”');
    expect(xml).toContain('release="v&quot;1&quot;"');
  });
});

describe('decodeXmlBytes', () => {
  it('reads a Latin-1 file using its declared encoding', () => {
    const bytes = encodeLatin1('<?xml version="1.0" encoding="iso-8859-1"?><name>Zoë</name>');
    expect(decodeXmlBytes(bytes)).toContain('<name>Zoë</name>');
  });

  it('falls back to UTF-8 when no encoding is declared', () => {
    const bytes = new TextEncoder().encode('<?xml version="1.0"?><name>Zoë</name>');
    expect(decodeXmlBytes(bytes)).toContain('<name>Zoë</name>');
  });
});
