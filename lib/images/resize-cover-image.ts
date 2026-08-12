// lib/images/resize-cover-image.ts
// Browser-only: scales a campaign cover image down to fit within a max
// dimension and re-encodes it as JPEG, preserving the source's aspect ratio
// exactly (no center-crop) — a module/book cover is usually a portrait
// rectangle, not a square, and cropping it hides part of the artwork.

const JPEG_QUALITY = 0.85;

export async function resizeCoverImage(file: File, maxDimension: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode image'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}
