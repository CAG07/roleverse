-- Add module_description column to campaigns table.
-- Lets players tell the GM which published module/adventure (or homebrew premise)
-- they're running, without uploading a PDF. Separate from `description` (general
-- campaign flavor text) so existing campaign descriptions are left untouched.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS module_description TEXT;

COMMENT ON COLUMN public.campaigns.module_description IS
  'Player-entered module/adventure name or premise (e.g. "Palace of the Silver Princess (B3)") — read by the Game Master and Lore Keeper agents.';
