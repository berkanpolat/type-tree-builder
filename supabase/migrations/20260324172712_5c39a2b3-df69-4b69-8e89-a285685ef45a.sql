
-- Add fake_favori_sayisi to urunler for superadmin fake favorites
ALTER TABLE public.urunler ADD COLUMN IF NOT EXISTS fake_favori_sayisi integer NOT NULL DEFAULT 0;

-- SECURITY DEFINER function to increment urun view count (bypasses RLS)
CREATE OR REPLACE FUNCTION public.increment_urun_view(p_urun_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.urunler
  SET goruntuleme_sayisi = goruntuleme_sayisi + 1
  WHERE id = p_urun_id;
$$;
