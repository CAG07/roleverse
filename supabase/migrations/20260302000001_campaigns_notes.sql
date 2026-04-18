-- Add notes column to campaigns table for Lore Keeper agent.
-- GM notes are read by the Lore Keeper to answer lore/story questions.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.campaigns.notes IS
  'GM notes for the campaign — read by the Lore Keeper agent to answer lore questions.';
