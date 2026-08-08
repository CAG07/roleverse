// lib/rag/search-campaign-priority.ts
// Guaranteed, non-competing retrieval over a campaign's own "priority" content
// (currently source_type = 'user_pdf' — module PDFs and, if a player uploads
// one, a house-rules doc; no dedicated house-rules editor exists, an upload
// gets identical treatment either way). Calls match_campaign_priority_embeddings
// rather than match_rules_embeddings so this content never competes against
// baseline SRD chunks in one ranked pool — see the migration's own comment
// for why that distinction matters.

import { embedText } from '@/lib/rag/embed';
import { createClient } from '@/lib/supabase/server';

export interface CampaignPriorityMatch {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  sourceType: string;
  similarity: number;
}

export interface SearchCampaignPriorityOptions {
  campaignId: string;
  sourceTypes: string[];
  minSimilarity?: number;
  matchCount?: number;
}

export async function searchCampaignPriorityContent(
  query: string,
  options: SearchCampaignPriorityOptions
): Promise<CampaignPriorityMatch[]> {
  const { campaignId, sourceTypes, minSimilarity = 0.3, matchCount = 5 } = options;

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(query);
  } catch {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('match_campaign_priority_embeddings', {
    query_embedding: queryEmbedding,
    query_campaign_id: campaignId,
    source_types: sourceTypes,
    match_threshold: minSimilarity,
    match_count: matchCount,
  });

  if (error || !data) {
    console.warn('searchCampaignPriorityContent: match_campaign_priority_embeddings failed:', error?.message);
    return [];
  }

  const results = (data as { id: string; content: string; metadata: Record<string, unknown>; source_type: string; similarity: number }[]).map(
    (r) => ({
      id: r.id,
      content: r.content,
      metadata: r.metadata,
      sourceType: r.source_type,
      similarity: r.similarity,
    })
  );

  return results.sort((a, b) => b.similarity - a.similarity);
}
