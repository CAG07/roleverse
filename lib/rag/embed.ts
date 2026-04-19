// lib/rag/embed.ts
// Voyage AI voyage-3-lite wrapper for the RAG pipeline.
// Replaces OpenAI text-embedding-3-small. Voyage is Anthropic-recommended
// and free up to 200M tokens/month.

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const EMBEDDING_MODEL = 'voyage-3-lite';
/** Native dimension of voyage-3-lite — matches VECTOR(512) in schema */
export const EMBEDDING_DIMENSIONS = 512;
/** Voyage supports up to 128 texts per request */
const BATCH_SIZE = 128;

/** Shape of a Voyage AI embeddings response */
interface VoyageEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

/**
 * Embed a single text string.
 * Returns a 1024-dimension float array.
 */
export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedBatch([text]);
  return embedding;
}

/**
 * Embed an array of texts in batches using the Voyage AI REST API.
 * Returns embeddings in the same order as the input array.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY environment variable is not set');
  }

  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Voyage AI embedding request failed: ${response.status} ${response.statusText} — ${errorText}`
      );
    }

    const result = (await response.json()) as VoyageEmbeddingResponse;

    // API returns results in the same order as input, but sort defensively
    const sorted = result.data.sort((a, b) => a.index - b.index);
    embeddings.push(...sorted.map((item) => item.embedding));
  }

  return embeddings;
}
