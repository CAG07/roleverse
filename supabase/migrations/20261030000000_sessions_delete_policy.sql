-- Let players delete their own session logs from the session log page.
--
-- sessions had SELECT, INSERT, and UPDATE policies but no DELETE policy, so a
-- .delete() under RLS silently removed nothing. Additive: no existing policy or
-- row changes.
--
-- Only ended sessions can be deleted (ended_at IS NOT NULL): the live session
-- must be stopped first, so the session being played can never be deleted out
-- from under the chat. The campaign must also belong to the user, matching the
-- ownership pattern used by the other campaign-scoped tables.
--
-- combat_state rows reference sessions ON DELETE CASCADE, so they go with it.

DROP POLICY IF EXISTS "Users can delete own ended sessions" ON public.sessions;
CREATE POLICY "Users can delete own ended sessions"
  ON public.sessions FOR DELETE
  USING (
    auth.uid() = user_id
    AND ended_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.owner_id = auth.uid()
    )
  );
