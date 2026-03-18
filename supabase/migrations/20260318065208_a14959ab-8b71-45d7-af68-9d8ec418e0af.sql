
CREATE OR REPLACE FUNCTION public.notify_urun_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  msg text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.durum = 'onay_bekliyor' THEN
    msg := NEW.urun_no || ' numaralı ' || NEW.baslik || ' başlıklı ürününüz değerlendirilmeye alınmıştır.';
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (NEW.user_id, 'urun_onay_bekliyor', msg, '/urunlerim');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.durum IS DISTINCT FROM NEW.durum THEN
    IF NEW.durum = 'onay_bekliyor' THEN
      msg := NEW.urun_no || ' numaralı ' || NEW.baslik || ' başlıklı ürününüz değerlendirilmeye alınmıştır.';
      INSERT INTO public.notifications (user_id, type, message, link)
      VALUES (NEW.user_id, 'urun_onay_bekliyor', msg, '/urunlerim');
    ELSIF NEW.durum = 'aktif' AND OLD.durum = 'onay_bekliyor' THEN
      NULL;
    ELSIF NEW.durum = 'reddedildi' THEN
      NULL;
    ELSIF NEW.durum <> 'reddedildi' THEN
      msg := NEW.urun_no || ' numaralı ' || NEW.baslik || ' başlıklı ürününüzün durumu başarıyla değiştirilmiştir.';
      INSERT INTO public.notifications (user_id, type, message, link)
      VALUES (NEW.user_id, 'urun_durum_degisti', msg, '/urunlerim');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
