// lib/images/pdf-cover-image.ts
// Server-only: rasterizes page 1 of a single-page PDF (e.g. a "print to PDF"
// of just a module's cover page) to a JPEG buffer — the PDF-upload
// counterpart to resize-cover-image.ts's browser-side canvas resize.
// Produces the same JPEG-quality-0.85 output so both upload paths converge
// on identical stored artifacts regardless of which one a player used.
//
// Reuses the same pipeline already used server-side for module-map
// extraction (lib/rag/pdf-pages.ts): unpdf (pure JS/WASM PDF.js, no native
// binary) to open/measure/render the page, @napi-rs/canvas (prebuilt native
// bindings, Vercel-safe) to re-encode the rendered PNG as JPEG. Both are
// Node-only — @napi-rs/canvas is a native addon and can't run in the
// browser, which is why this can't just reuse resize-cover-image.ts.

import { getDocumentProxy, renderPageAsImage } from 'unpdf';
import { Image, createCanvas } from '@napi-rs/canvas';

const JPEG_QUALITY = 0.85; // same 0-1 scale as resize-cover-image.ts's canvas.toBlob

/** Defensive ceiling on the render scale itself, independent of the
 * maxDimension targeting below — guards the case where a malformed/degenerate
 * PDF reports a near-zero page dimension, which would otherwise drive the
 * scale needed to reach maxDimension arbitrarily high. */
const MAX_RENDER_SCALE = 50;

/**
 * Renders a single-page PDF's only page to a JPEG buffer, scaled so its
 * longest edge is `maxDimension` (never upscaled beyond the source).
 * Throws a user-facing message if the PDF has more than one page, or if its
 * page dimensions can't be read.
 */
export async function renderPdfCoverToJpeg(fileBuffer: Buffer, maxDimension: number): Promise<Buffer> {
  const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));

  if (pdf.numPages !== 1) {
    throw new Error(
      `This PDF has ${pdf.numPages} pages — cover upload only accepts a single-page PDF (e.g. a "print to PDF" of just the cover).`
    );
  }

  const page = await pdf.getPage(1);
  const { width: pageWidth, height: pageHeight } = page.getViewport({ scale: 1 });

  if (!Number.isFinite(pageWidth) || !Number.isFinite(pageHeight) || pageWidth <= 0 || pageHeight <= 0) {
    throw new Error("Couldn't read this PDF's page size.");
  }

  const longEdge = Math.max(pageWidth, pageHeight);
  const scale = Math.min(1, maxDimension / longEdge, MAX_RENDER_SCALE);

  const renderedPng = await renderPageAsImage(pdf, 1, {
    scale,
    toDataURL: false,
    canvasImport: () => import('@napi-rs/canvas'),
  });

  const image = new Image();
  image.src = new Uint8Array(renderedPng);
  await image.decode();

  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  return canvas.toBuffer('image/jpeg', JPEG_QUALITY);
}
