-- Add the missing DELETE policy on campaign_embeddings.
--
-- Caught by GitHub Copilot's automated review on PR #296 (oracles): RLS is
-- enabled on campaign_embeddings but only SELECT/INSERT policies were ever
-- added (20260301000000_rag_phase_6a.sql) — no DELETE policy exists at all.
-- Both lib/rag/ingest-campaign-pdf.ts's deleteIndexedPdfChunks (existing,
-- pre-dates this fix) and lib/oracle/ingest-oracle-ref.ts's
-- deleteIndexedOracleRefChunks (added in the same PR this was caught on)
-- call `.delete()` on this table through the RLS-protected request-scoped
-- client — without this policy, those deletes silently affect zero rows
-- under RLS (Postgres/PostgREST don't error on a DELETE blocked by RLS,
-- they just delete nothing), so re-indexing a file has been leaving stale
-- chunks behind instead of actually replacing them. Pre-existing gap, not
-- new to the oracle feature — this fixes it for both paths.
--
-- 20260820010000_oracle_solo_play.sql already merged to main and applied to
-- the live database by the time this was caught, so this is a new migration
-- rather than an edit to that one, per this project's "never edit a
-- deployed migration" rule.
--
-- Mirrors the existing SELECT policy's ownership check exactly (a row's
-- own uploader, or the owner of the campaign it belongs to).

DROP POLICY IF EXISTS "Users can delete embeddings" ON public.campaign_embeddings;
CREATE POLICY "Users can delete embeddings"
  ON public.campaign_embeddings FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_embeddings.campaign_id
        AND c.owner_id = auth.uid()
    )
  );
