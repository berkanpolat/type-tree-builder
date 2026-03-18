
CREATE OR REPLACE FUNCTION public.notify_ihale_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  msg text;
  bidder_record record;
  durum_label text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.durum = NEW.durum THEN
    RETURN NEW;
  END IF;

  IF NEW.durum = 'onay_bekliyor' THEN
    msg := NEW.ihale_no || ' numaralı ' || NEW.baslik || ' başlıklı ihaleniz değerlendirilmeye alınmıştır.';
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (NEW.user_id, 'ihale_onay_bekliyor', msg, '/ihalelerim/takip/' || NEW.id);
  ELSIF NEW.durum = 'devam_ediyor' AND OLD.durum = 'onay_bekliyor' THEN
    NULL;
  ELSIF NEW.durum = 'reddedildi' THEN
    NULL;
  ELSIF NEW.durum = 'iptal' THEN
    msg := NEW.ihale_no || ' numaralı ' || NEW.baslik || ' başlıklı ihaleniz iptal edildi.';
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (NEW.user_id, 'ihale_iptal', msg, '/ihalelerim');
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.durum IS DISTINCT FROM NEW.durum THEN
    durum_label := CASE NEW.durum
      WHEN 'devam_ediyor' THEN 'Devam Ediyor'
      WHEN 'tamamlandi' THEN 'Tamamlandı'
      WHEN 'iptal' THEN 'İptal Edildi'
      WHEN 'reddedildi' THEN 'Reddedildi'
      ELSE NEW.durum
    END;

    FOR bidder_record IN
      SELECT DISTINCT teklif_veren_user_id FROM public.ihale_teklifler WHERE ihale_id = NEW.id
    LOOP
      IF bidder_record.teklif_veren_user_id != NEW.user_id THEN
        msg := 'Teklif verdiğiniz ' || NEW.ihale_no || ' numaralı ' || NEW.baslik || ' başlıklı ihalenin durumu ' || durum_label || ' olarak değiştirildi.';
        INSERT INTO public.notifications (user_id, type, message, link)
        VALUES (bidder_record.teklif_veren_user_id, 'teklif_ihale_durum_degisti', msg, '/tekihale/' || NEW.id);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;
