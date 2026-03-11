ALTER TABLE public.kullanici_abonelikler
ADD COLUMN IF NOT EXISTS ekstra_haklar jsonb NOT NULL DEFAULT '{}'::jsonb;