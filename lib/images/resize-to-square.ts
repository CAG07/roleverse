// lib/images/resize-to-square.ts
// Browser-only: center-crops an image file to a square and re-encodes it at a
// fixed resolution, so campaign cover uploads stay small and uniform regardless
// of the source photo's dimensions.

const JPEG_QUALITY = 0.85;

export async function resizeImageToSquare(file: File, targetSize: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const cropSize = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - cropSize) / 2;
  const sy = (bitmap.height - cropSize) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(bitmap, sx, sy, cropSize, cropSize, 0, 0, targetSize, targetSize);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode image'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}
