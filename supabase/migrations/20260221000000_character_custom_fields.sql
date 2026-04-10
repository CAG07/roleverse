-- Per-character custom fields list. Open-ended user-defined tracking
-- (e.g. Pact Points, Reputation, homebrew resources).
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS game_data_custom JSONB DEFAULT '[]'::jsonb;
