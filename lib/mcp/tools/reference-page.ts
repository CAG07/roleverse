// lib/mcp/tools/reference-page.ts
// On-demand exact-page lookup: when a player/DM explicitly names a page or
// section number from their uploaded module, fetch that page's indexed
// content directly by metadata filter — not similarity search — and return
// it as authoritative context for this turn. Deliberately a separate simple
// query, NOT a change to match_campaign_priority_embeddings (see
// .claude/commands/escalate.md: changing the pgvector match function,
// threshold, or embedding dimensions requires escalation; this sidesteps
// that entirely since it isn't a similarity search at all).

import { createClient } from '@/lib/supabase/server';
import type { MCPContext } from '../types';

export interface ReferencePageInput {
  page_number: number;
}

export interface ReferencePageChunk {
  content: string;
  category: string; // 'module' | 'map_layout'
  /** Source filename (metadata.title) — surfaced so a multi-document campaign's
   *  page-number collision (see the `note` below) is actually resolvable by the
   *  caller instead of just flagged. */
  title?: string;
}

export interface ReferencePageOutput {
  pageNumber: number;
  chunks: ReferencePageChunk[];
  note?: string;
}

export async function executeReferencePage(
  input: ReferencePageInput,
  context: MCPContext
): Promise<ReferencePageOutput> {
  const pageNumber = Math.trunc(input.page_number);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('campaign_embeddings')
    .select('content, metadata')
    .eq('campaign_id', context.campaignId)
    .eq('source_type', 'user_pdf')
    .eq('metadata->>pageNumber', String(pageNumber));

  if (error || !data || data.length === 0) {
    return {
      pageNumber,
      chunks: [],
      note: 'No indexed content found for that page — it may be from a source uploaded before page tracking was added, a non-PDF upload, or outside the document.',
    };
  }

  const rows = data as { content: string; metadata: Record<string, unknown> }[];

  // A campaign with more than one uploaded module PDF has no cross-file page
  // uniqueness — this filters only by campaign + page number, so results
  // could span two different documents' "page 33." Flagged rather than
  // silently resolved: most campaigns have one primary module upload, but a
  // multi-file one should see this note rather than a confident wrong answer.
  const distinctTitles = new Set(rows.map((r) => r.metadata?.title).filter(Boolean));
  const note =
    distinctTitles.size > 1
      ? 'Multiple uploaded files share this page number — results below may come from more than one document.'
      : undefined;

  return {
    pageNumber,
    chunks: rows.map((r) => ({
      content: r.content,
      category: (r.metadata?.category as string | undefined) ?? 'module',
      title: r.metadata?.title as string | undefined,
    })),
    ...(note ? { note } : {}),
  };
}
