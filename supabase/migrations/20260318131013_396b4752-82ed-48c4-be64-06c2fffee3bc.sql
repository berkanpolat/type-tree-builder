
ALTER TABLE public.firmalar ADD COLUMN IF NOT EXISTS meta_title text DEFAULT NULL;
ALTER TABLE public.firmalar ADD COLUMN IF NOT EXISTS meta_description text DEFAULT NULL;

ALTER TABLE public.ihaleler ADD COLUMN IF NOT EXISTS meta_title text DEFAULT NULL;
ALTER TABLE public.ihaleler ADD COLUMN IF NOT EXISTS meta_description text DEFAULT NULL;
