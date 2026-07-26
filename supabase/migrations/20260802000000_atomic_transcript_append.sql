-- ============================================================================
-- Atomic transcript append
-- app/api/sessions/[sessionId]/message/route.ts persisted each turn by
-- SELECTing sessions.transcript, appending in JS, then UPDATEing the whole
-- array back. Two overlapping requests for the same session (a double-fire
-- of handleSend before React re-renders isLoading, two tabs on one session,
-- a client retry) could both read the same starting array; whichever UPDATE
-- committed last silently overwrote the other's turn with no error surfaced.
--
-- Moving the append into the UPDATE itself lets Postgres serialize
-- concurrent writers on the row: each statement's `transcript || p_entries`
-- reads the current committed value at the moment IT executes, not a
-- JS-side snapshot taken earlier. No SECURITY DEFINER — runs as the calling
-- (invoker) role, so the existing "Users can update own sessions" RLS policy
-- (auth.uid() = user_id) still applies unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.append_session_transcript(
  p_session_id UUID,
  p_entries JSONB
)
RETURNS JSONB
LANGUAGE SQL
SET search_path = ''
AS $$
  UPDATE public.sessions
  SET transcript = COALESCE(transcript, '[]'::jsonb) || COALESCE(p_entries, '[]'::jsonb)
  WHERE id = p_session_id
  RETURNING transcript;
$$;
