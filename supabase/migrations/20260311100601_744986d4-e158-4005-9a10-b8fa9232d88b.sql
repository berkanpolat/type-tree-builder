
-- Add action log columns to sikayetler table
ALTER TABLE public.sikayetler 
  ADD COLUMN IF NOT EXISTS islem_tipi TEXT,
  ADD COLUMN IF NOT EXISTS islem_yapan TEXT,
  ADD COLUMN IF NOT EXISTS islem_tarihi TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS islem_detay TEXT;
