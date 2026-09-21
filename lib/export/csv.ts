// lib/export/csv.ts
// Minimal, dependency-free RFC4180-style CSV serializer. Hand-written rather
// than pulling in a library — small enough to own outright, matching the
// same call already made for the Fantasy Grounds XML export (see
// lib/character/export/fantasy-grounds/xml.ts's header comment).

function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Builds a CSV string (CRLF row endings, per RFC4180) from headers + rows. */
export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  return lines.join('\r\n');
}
