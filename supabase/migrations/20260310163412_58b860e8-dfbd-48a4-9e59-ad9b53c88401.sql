
CREATE OR REPLACE FUNCTION public.notify_sikayet_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  msg text;
  tur_label text;
BEGIN
  tur_label := CASE NEW.tur
    WHEN 'mesaj' THEN 'mesaj'
    WHEN 'ihale' THEN 'ihale'
    WHEN 'urun' THEN 'ürün'
    WHEN 'profil' THEN 'profil'
    ELSE NEW.tur
  END;

  msg := NEW.sikayet_no || ' numaralı ' || tur_label || ' şikayetiniz başarıyla alınmıştır. En kısa sürede incelenecektir.';
  
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (NEW.bildiren_user_id, 'sikayet_alindi', msg, NULL);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_sikayet_created
AFTER INSERT ON public.sikayetler
FOR EACH ROW
EXECUTE FUNCTION public.notify_sikayet_created();
