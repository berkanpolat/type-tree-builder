
-- Add admin decision columns to ihaleler
ALTER TABLE public.ihaleler ADD COLUMN IF NOT EXISTS admin_karar_sebebi text DEFAULT NULL;
ALTER TABLE public.ihaleler ADD COLUMN IF NOT EXISTS admin_karar_veren text DEFAULT NULL;
ALTER TABLE public.ihaleler ADD COLUMN IF NOT EXISTS admin_karar_tarihi timestamp with time zone DEFAULT NULL;

-- Add admin decision columns to urunler
ALTER TABLE public.urunler ADD COLUMN IF NOT EXISTS admin_karar_sebebi text DEFAULT NULL;
ALTER TABLE public.urunler ADD COLUMN IF NOT EXISTS admin_karar_veren text DEFAULT NULL;
ALTER TABLE public.urunler ADD COLUMN IF NOT EXISTS admin_karar_tarihi timestamp with time zone DEFAULT NULL;

-- Update the ihale status change trigger to skip notification when status is reddedildi
-- (because the edge function handles rejection notifications with the reason)
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
    VALUES (NEW.user_id, 'ihale_onay_bekliyor', msg, '/manuihale/takip/' || NEW.id);
  ELSIF NEW.durum = 'devam_ediyor' AND OLD.durum = 'onay_bekliyor' THEN
    -- Only trigger notification if admin_karar_veren is NOT set (meaning it came from trigger, not edge function)
    -- Skip: edge function handles approval notifications with admin info
    NULL;
  ELSIF NEW.durum = 'reddedildi' THEN
    -- Skip: edge function handles rejection notifications with reason and admin info
    NULL;
  ELSIF NEW.durum = 'iptal' THEN
    msg := NEW.ihale_no || ' numaralı ' || NEW.baslik || ' başlıklı ihaleniz iptal edildi.';
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (NEW.user_id, 'ihale_iptal', msg, '/manuihale');
  END IF;

  -- Notify bidders about status changes
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

-- Update urun status change trigger to skip reddedildi (edge function handles it)
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
    VALUES (NEW.user_id, 'urun_onay_bekliyor', msg, '/manupazar');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.durum IS DISTINCT FROM NEW.durum THEN
    IF NEW.durum = 'onay_bekliyor' THEN
      msg := NEW.urun_no || ' numaralı ' || NEW.baslik || ' başlıklı ürününüz değerlendirilmeye alınmıştır.';
      INSERT INTO public.notifications (user_id, type, message, link)
      VALUES (NEW.user_id, 'urun_onay_bekliyor', msg, '/manupazar');
    ELSIF NEW.durum = 'aktif' AND OLD.durum = 'onay_bekliyor' THEN
      -- Skip: edge function handles approval notifications with admin info
      NULL;
    ELSIF NEW.durum = 'reddedildi' THEN
      -- Skip: edge function handles rejection notifications with reason and admin info
      NULL;
    ELSIF NEW.durum <> 'reddedildi' THEN
      msg := NEW.urun_no || ' numaralı ' || NEW.baslik || ' başlıklı ürününüzün durumu başarıyla değiştirilmiştir.';
      INSERT INTO public.notifications (user_id, type, message, link)
      VALUES (NEW.user_id, 'urun_durum_degisti', msg, '/manupazar');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
