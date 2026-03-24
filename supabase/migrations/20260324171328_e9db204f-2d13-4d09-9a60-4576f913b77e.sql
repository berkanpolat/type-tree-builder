
CREATE OR REPLACE FUNCTION public.increment_ihale_view(p_ihale_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.ihaleler
  SET goruntuleme_sayisi = goruntuleme_sayisi + 1
  WHERE id = p_ihale_id;
$$;
