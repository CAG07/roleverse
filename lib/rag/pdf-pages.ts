// lib/rag/pdf-pages.ts
// Identifies candidate map/illustration pages in an uploaded module PDF and
// renders them to images for vision transcription (see lib/rag/map-vision.ts).
//
// Uses unpdf — a pure JS/WASM PDF.js build with no native system executable
// dependency (unlike Poppler/Ghostscript-based tools such as pdftoppm, which
// are not reliably present in a serverless environment; this was confirmed
// directly earlier this session). Page rendering still needs @napi-rs/canvas,
// but that ships prebuilt native bindings as an npm package rather than
// shelling out to a system binary, so it works on Vercel.
//
// Detection deliberately does not use unpdf's extractImages() to measure
// per-page image coverage: it returns raw decoded pixel buffers with no
// bounding-box or page-dimension data, and it misses vector-drawn line art
// entirely (plausible for a redrawn/remastered scan of an old module). A
// cheap per-page extracted-text length is used instead — a page with very
// little body text is a candidate — which also sidesteps both problems by
// rendering the whole page once it's flagged, catching vector art for free.

import { getDocumentProxy, extractText, renderPageAsImage } from 'unpdf';

/** Pages with less extracted text than this are treated as candidates. */
const CANDIDATE_TEXT_THRESHOLD = 500;

/** Render scale tuned to land around ~1000-1200px on the long edge, keeping
 * per-image vision token cost bounded (see lib/rag/map-vision.ts). */
const RENDER_SCALE = 1.5;

export interface MapCandidatePage {
  pageNumber: number;
  pngBase64: string;
}

export async function detectMapCandidatePages(fileBuffer: Buffer): Promise<MapCandidatePage[]> {
  const data = new Uint8Array(fileBuffer);
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: false });

  const candidates: MapCandidatePage[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i].trim().length >= CANDIDATE_TEXT_THRESHOLD) continue;

    const pageNumber = i + 1;
    const rendered = await renderPageAsImage(pdf, pageNumber, {
      scale: RENDER_SCALE,
      toDataURL: false,
    });
    candidates.push({
      pageNumber,
      pngBase64: Buffer.from(rendered).toString('base64'),
    });
  }

  return candidates;
}
