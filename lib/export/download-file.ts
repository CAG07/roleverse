// lib/export/download-file.ts
// Shared client-side "save this string as a file" helper — the same
// Blob + synthetic <a download> pattern originally written inline in
// CharacterDetailPage.tsx, now shared with the CSV and session-Markdown
// exporters so there's one implementation instead of three.

/** `content` is a string (written as UTF-8) or raw bytes, e.g. Latin-1 Fantasy Grounds XML. */
export function downloadFile(
  content: string | Uint8Array<ArrayBuffer>,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Filesystem/URL-safe slug, matching the pattern already used for character exports. */
export function slugify(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || fallback;
}
