// lib/rag/types.ts
// Core types for the RAG (Retrieval-Augmented Generation) pipeline

/** A single chunk of text ready for embedding and storage */
export interface RagChunk {
  /** Raw text content of the chunk */
  content: string;
  /** Structured metadata for filtering and attribution */
  metadata: ChunkMetadata;
}

/** Metadata attached to every embedded chunk */
export interface ChunkMetadata {
  /** Game system this content belongs to (e.g. '5E_2014') */
  gameSystem: string;
  /** Source label (e.g. 'open5e', 'osric', 'pf2e-foundry') */
  source: string;
  /** Logical category within the source (e.g. 'spell', 'monster', 'class', 'rule') */
  category: string;
  /** Human-readable title for this chunk (e.g. 'Fireball', 'Dragon, Adult Red') */
  title?: string;
  /** Source URL or file path for attribution */
  sourceUrl?: string;
  /** Any additional system-specific fields */
  [key: string]: unknown;
}

/** A chunk with its computed embedding vector */
export interface EmbeddedChunk extends RagChunk {
  /** 1536-dimension embedding from text-embedding-3-small */
  embedding: number[];
}

/** Result row returned by match_rules_embeddings Supabase function */
export interface RulesMatchResult {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  source_type: string;
  similarity: number;
}
