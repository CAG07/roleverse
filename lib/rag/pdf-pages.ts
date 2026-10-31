// lib/rag/pdf-pages.ts
// Renders module PDF pages to images for map detection and map reading
// (see lib/rag/map-vision.ts).
//
// Uses unpdf — a pure JS/WASM PDF.js build with no native system executable
// dependency (unlike Poppler/Ghostscript-based tools such as pdftoppm, which
// are not reliably present in a serverless environment). Page rendering and
// tile cropping use @napi-rs/canvas, which ships prebuilt native bindings as
// an npm package rather than shelling out to a system binary, so it works on
// Vercel.
//
// Detection used to pick pages by how little text they had, which missed a
// map printed beside its room key and scans whose text layer picked up the
// map's numbers. Every page is now shown to Claude as a small thumbnail
// instead, and Claude decides which pages are maps (classifyMapPages).

import { getDocumentProxy, renderPageAsImage } from 'unpdf';
import { createCanvas, loadImage } from '@napi-rs/canvas';

/** Long edge of a classification thumbnail — about 350 visual tokens per page. */
const THUMBNAIL_LONG_EDGE = 512;

/** Long edge of the full map page sent for reading — the highest resolution
 * current Claude models read without downscaling. */
const MAP_LONG_EDGE = 2576;

/** Long edge of the render the zoomed tiles are cut from. Each tile covers a
 * little over half the page in each direction, so tiles come out near
 * MAP_LONG_EDGE — roughly twice the detail of the full-page image, which is
 * what small room numbers and door symbols need. */
const TILE_SOURCE_LONG_EDGE = 4400;

/** How far neighbouring tiles overlap, as a share of the page, so a number on
 * a tile boundary is whole in at least one tile. */
const TILE_OVERLAP = 0.1;

export interface PageImage {
  pageNumber: number;
  pngBase64: string;
}

export interface MapPageImages {
  pageNumber: number;
  fullPagePngBase64: string;
  tiles: { position: string; pngBase64: string }[];
  /** The high-resolution render the tiles were cut from; saved for map views in play. */
  sourcePng: Buffer;
}

async function renderAtLongEdge(
  pdf: Awaited<ReturnType<typeof getDocumentProxy>>,
  pageNumber: number,
  longEdge: number
): Promise<Buffer> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const scale = longEdge / Math.max(viewport.width, viewport.height);
  // unpdf needs the canvas module passed in explicitly under Node; without it
  // every render throws. That is why no map page was ever read before this fix.
  const rendered = await renderPageAsImage(pdf, pageNumber, {
    scale,
    toDataURL: false,
    canvasImport: () => import('@napi-rs/canvas'),
  });
  return Buffer.from(rendered);
}

/** One small thumbnail per page, in page order. */
export async function renderPageThumbnails(fileBuffer: Buffer): Promise<PageImage[]> {
  const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
  const thumbnails: PageImage[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const png = await renderAtLongEdge(pdf, pageNumber, THUMBNAIL_LONG_EDGE);
    thumbnails.push({ pageNumber, pngBase64: png.toString('base64') });
  }
  return thumbnails;
}

/** The full page plus four overlapping zoomed tiles (2×2) of one map page. */
export async function renderMapPage(fileBuffer: Buffer, pageNumber: number): Promise<MapPageImages> {
  const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    throw new Error(`Page ${pageNumber} does not exist in this PDF.`);
  }

  const sourcePng = await renderAtLongEdge(pdf, pageNumber, TILE_SOURCE_LONG_EDGE);
  const source = await loadImage(sourcePng);

  const fullScale = MAP_LONG_EDGE / Math.max(source.width, source.height);
  const full = createCanvas(Math.round(source.width * fullScale), Math.round(source.height * fullScale));
  full.getContext('2d').drawImage(source, 0, 0, full.width, full.height);

  const tileWidth = Math.round(source.width * (0.5 + TILE_OVERLAP / 2));
  const tileHeight = Math.round(source.height * (0.5 + TILE_OVERLAP / 2));
  const tileScale = Math.min(1, MAP_LONG_EDGE / Math.max(tileWidth, tileHeight));
  const tiles: MapPageImages['tiles'] = [];
  for (const [row, y] of [0, source.height - tileHeight].entries()) {
    for (const [col, x] of [0, source.width - tileWidth].entries()) {
      const tile = createCanvas(Math.round(tileWidth * tileScale), Math.round(tileHeight * tileScale));
      tile.getContext('2d').drawImage(source, x, y, tileWidth, tileHeight, 0, 0, tile.width, tile.height);
      tiles.push({
        position: `${row === 0 ? 'top' : 'bottom'} ${col === 0 ? 'left' : 'right'}`,
        pngBase64: tile.toBuffer('image/png').toString('base64'),
      });
    }
  }

  return {
    pageNumber,
    fullPagePngBase64: full.toBuffer('image/png').toString('base64'),
    tiles,
    sourcePng,
  };
}
