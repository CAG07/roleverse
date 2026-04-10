// lib/rag/embed.ts
// OpenAI text-embedding-3-small wrapper for the RAG pipeline.
// Handles batching to stay within the API's token-per-request limits.

import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
/** Native dimension of text-embedding-3-small — matches VECTOR(1536) in schema */
const EMBEDDING_DIMENSIONS = 1536;
/** Maximum number of texts to embed in a single API call */
const BATCH_SIZE = 100;

/** Lazy-initialised OpenAI client (instantiated once per cold start) */
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/**
 * Embed a single text string.
 * Returns a 1536-dimension float array.
 */
export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedBatch([text]);
  return embedding;
}

/**
 * Embed an array of texts in batches.
 * Returns embeddings in the same order as the input array.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getClient();
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    // API returns results in the same order as input
    const sorted = response.data.sort((a, b) => a.index - b.index);
    embeddings.push(...sorted.map((item) => item.embedding));
  }

  return embeddings;
}
