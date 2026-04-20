// lib/rag/chunk.ts
// Text chunking utilities for the RAG pipeline.
// Splits long documents into overlapping chunks suitable for embedding.

/** Options for the chunking algorithm */
export interface ChunkOptions {
  /** Maximum characters per chunk (default: 1200) */
  maxChars?: number;
  /** Overlap characters between consecutive chunks (default: 200) */
  overlapChars?: number;
}

const DEFAULT_MAX_CHARS = 1200;
const DEFAULT_OVERLAP_CHARS = 200;

/**
 * Split a long text into overlapping chunks.
 *
 * Strategy:
 * 1. Split on paragraph boundaries first (double newline) to avoid breaking mid-sentence.
 * 2. If a paragraph exceeds maxChars, split it on sentence boundaries (`. `).
 * 3. If a single sentence still exceeds maxChars, hard-slice it.
 *
 * Consecutive chunks share `overlapChars` characters of trailing context from the
 * previous chunk so that sentence-spanning facts are not lost at boundaries.
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const overlapChars = options.overlapChars ?? DEFAULT_OVERLAP_CHARS;

  // Normalise whitespace: collapse runs of 3+ blank lines to double newline
  const normalised = text.replace(/\n{3,}/g, '\n\n').trim();
  if (normalised.length === 0) return [];
  if (normalised.length <= maxChars) return [normalised];

  // Break into paragraphs
  const paragraphs = normalised.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();

    // If the paragraph fits in the current accumulator, append it
    if (current.length + trimmed.length + 2 <= maxChars) {
      current = current.length > 0 ? `${current}\n\n${trimmed}` : trimmed;
      continue;
    }

    // Flush the current accumulator before starting on this paragraph
    if (current.length > 0) {
      chunks.push(current);
      // Carry overlap from the end of the current accumulator into the next chunk
      current = current.slice(-overlapChars);
    }

    // If the paragraph itself is too long, split it on sentence boundaries
    if (trimmed.length > maxChars) {
      const sentences = splitIntoSentences(trimmed);
      for (const sentence of sentences) {
        if (current.length + sentence.length + 1 <= maxChars) {
          current = current.length > 0 ? `${current} ${sentence}` : sentence;
        } else {
          if (current.length > 0) {
            chunks.push(current);
            current = current.slice(-overlapChars);
          }
          // If even a single sentence is too long, hard-slice it
          if (sentence.length > maxChars) {
            const slices = hardSlice(sentence, maxChars, overlapChars);
            for (let i = 0; i < slices.length - 1; i++) {
              chunks.push(slices[i]);
            }
            current = slices[slices.length - 1];
          } else {
            current = sentence;
          }
        }
      }
    } else {
      // current already holds the overlap suffix after the flush above;
      // append the paragraph with a double newline separator.
      current = current.length > 0 ? `${current}\n\n${trimmed}` : trimmed;
    }
  }

  // Flush remaining content
  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks.filter((c) => c.trim().length > 0);
}

/** Split a paragraph into individual sentences on `. `, `! `, or `? ` boundaries */
function splitIntoSentences(text: string): string[] {
  // Lookahead split: preserve the punctuation with the sentence
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

/** Hard-slice a string into segments of at most maxChars, with overlap */
function hardSlice(text: string, maxChars: number, overlapChars: number): string[] {
  const slices: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    slices.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - overlapChars;
  }
  return slices;
}
