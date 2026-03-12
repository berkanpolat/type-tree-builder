
-- Auto-complete expired ihaleler
CREATE OR REPLACE FUNCTION public.auto_complete_expired_ihaleler()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- On any ihaleler query, check if bitis_tarihi has passed
  IF NEW.durum = 'devam_ediyor' AND NEW.bitis_tarihi IS NOT NULL AND NEW.bitis_tarihi < now() THEN
    NEW.durum := 'tamamlandi';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_complete_expired_ihale
  BEFORE UPDATE ON public.ihaleler
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_complete_expired_ihaleler();
