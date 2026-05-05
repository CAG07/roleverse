// lib/rag/search.ts
// Shared RAG search helper for querying indexed rules embeddings.
// Used by the Rules Arbiter and Encounter Builder agents.

import { embedText } from '@/lib/rag/embed';
import { createClient } from '@/lib/supabase/server';

export interface RulesSearchMatch {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface SearchRulesOptions {
  /** Game system identifier (e.g. '5E_2014') */
  gameSystem: string;
  /** Optional campaign ID to scope the search */
  campaignId?: string | null;
  /** Minimum similarity score to include a chunk (default: 0.3) */
  minSimilarity?: number;
  /** Maximum number of chunks to return (default: 8) */
  matchCount?: number;
}

/**
 * Retrieve semantically similar rules chunks from the Supabase index.
 * Returns an empty array if embedding fails or no results are found.
 */
export async function searchRules(
  query: string,
  options: SearchRulesOptions
): Promise<RulesSearchMatch[]> {
  const { gameSystem, campaignId = null, minSimilarity = 0.3, matchCount = 8 } = options;

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(query);
  } catch {
    // If embedding fails (e.g., no API key), fall back gracefully
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('match_rules_embeddings', {
    query_embedding: queryEmbedding,
    query_game_system: gameSystem,
    query_campaign_id: campaignId,
    match_threshold: minSimilarity,
    match_count: matchCount,
  });

  if (error || !data) {
    console.warn('searchRules: match_rules_embeddings failed:', error?.message);
    return [];
  }

  const results = (data as RulesSearchMatch[]).sort((a, b) => b.similarity - a.similarity);
  return results;
}
