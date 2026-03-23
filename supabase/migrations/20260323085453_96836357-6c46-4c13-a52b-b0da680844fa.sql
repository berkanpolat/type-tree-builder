
CREATE OR REPLACE FUNCTION public.notify_new_teklif()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ihale_rec record;
  firma_unvani text;
  msg text;
BEGIN
  SELECT i.ihale_no, i.baslik, i.user_id INTO ihale_rec
  FROM public.ihaleler i WHERE i.id = NEW.ihale_id;

  SELECT f.firma_unvani INTO firma_unvani
  FROM public.firmalar f WHERE f.user_id = NEW.teklif_veren_user_id;

  msg := ihale_rec.ihale_no || ' numaralı ' || ihale_rec.baslik || ' başlıklı ihalenize ' || COALESCE(firma_unvani, 'Bir firma') || ' ' || NEW.tutar || ' tutarında yeni teklif yaptı. Hemen incele!';
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (ihale_rec.user_id, 'ihale_yeni_teklif', msg, '/ihalelerim/takip/' || NEW.ihale_id);

  msg := ihale_rec.ihale_no || ' numaralı ' || ihale_rec.baslik || ' başlıklı ihaleye ' || NEW.tutar || ' tutarlı teklifiniz başarıyla iletilmiştir.';
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (NEW.teklif_veren_user_id, 'teklif_iletildi', msg, '/tekliflerim');

  RETURN NEW;
END;
$function$;
