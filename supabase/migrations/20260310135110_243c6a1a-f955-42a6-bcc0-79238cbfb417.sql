
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  link text,
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: ihale status change
CREATE OR REPLACE FUNCTION public.notify_ihale_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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
  ELSIF NEW.durum = 'devam_ediyor' THEN
    msg := NEW.ihale_no || ' numaralı ' || NEW.baslik || ' başlıklı ihaleniz başarıyla yayınlanmıştır, teklif almaya başlayabilirsiniz.';
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (NEW.user_id, 'ihale_yayinlandi', msg, '/manuihale/takip/' || NEW.id);
  ELSIF NEW.durum = 'reddedildi' THEN
    msg := NEW.ihale_no || ' numaralı ' || NEW.baslik || ' başlıklı ihaleniz yayın şartlarını sağlamadığı için yayına alınmamıştır.';
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (NEW.user_id, 'ihale_reddedildi', msg, '/manuihale');
  ELSIF NEW.durum = 'iptal' THEN
    msg := NEW.ihale_no || ' numaralı ' || NEW.baslik || ' başlıklı ihaleniz iptal edildi.';
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (NEW.user_id, 'ihale_iptal', msg, '/manuihale');
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
$$;

CREATE TRIGGER trg_ihale_status_notification
  AFTER INSERT OR UPDATE ON public.ihaleler
  FOR EACH ROW EXECUTE FUNCTION public.notify_ihale_status_change();

-- Trigger: new teklif
CREATE OR REPLACE FUNCTION public.notify_new_teklif()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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
  VALUES (ihale_rec.user_id, 'ihale_yeni_teklif', msg, '/manuihale/takip/' || NEW.ihale_id);

  msg := ihale_rec.ihale_no || ' numaralı ' || ihale_rec.baslik || ' başlıklı ihaleye ' || NEW.tutar || ' tutarlı teklifiniz başarıyla iletilmiştir.';
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (NEW.teklif_veren_user_id, 'teklif_iletildi', msg, '/tekliflerim');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_teklif_notification
  AFTER INSERT ON public.ihale_teklifler
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_teklif();

-- Trigger: teklif status change
CREATE OR REPLACE FUNCTION public.notify_teklif_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  ihale_rec record;
  msg text;
BEGIN
  IF OLD.durum = NEW.durum THEN
    RETURN NEW;
  END IF;

  SELECT i.ihale_no, i.baslik INTO ihale_rec
  FROM public.ihaleler i WHERE i.id = NEW.ihale_id;

  IF NEW.durum = 'kabul_edildi' THEN
    msg := ihale_rec.ihale_no || ' numaralı ' || ihale_rec.baslik || ' başlıklı ihaleye verdiğiniz ' || NEW.tutar || ' tutarlı teklifiniz kabul edilmiştir.';
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (NEW.teklif_veren_user_id, 'teklif_kabul_edildi', msg, '/tekliflerim');
  ELSIF NEW.durum = 'reddedildi' THEN
    msg := ihale_rec.ihale_no || ' numaralı ' || ihale_rec.baslik || ' başlıklı ihaleye verdiğiniz ' || NEW.tutar || ' tutarlı teklifiniz reddedilmiştir.';
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (NEW.teklif_veren_user_id, 'teklif_reddedildi', msg, '/tekliflerim');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_teklif_status_notification
  AFTER UPDATE ON public.ihale_teklifler
  FOR EACH ROW EXECUTE FUNCTION public.notify_teklif_status_change();

-- Trigger: urun status change
CREATE OR REPLACE FUNCTION public.notify_urun_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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
    ELSIF NEW.durum = 'aktif' THEN
      msg := NEW.urun_no || ' numaralı ' || NEW.baslik || ' başlıklı ürününüz başarıyla yayınlanmıştır.';
      INSERT INTO public.notifications (user_id, type, message, link)
      VALUES (NEW.user_id, 'urun_yayinlandi', msg, '/manupazar');
    ELSE
      msg := NEW.urun_no || ' numaralı ' || NEW.baslik || ' başlıklı ürününüzün durumu başarıyla değiştirilmiştir.';
      INSERT INTO public.notifications (user_id, type, message, link)
      VALUES (NEW.user_id, 'urun_durum_degisti', msg, '/manupazar');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_urun_status_notification
  AFTER INSERT OR UPDATE ON public.urunler
  FOR EACH ROW EXECUTE FUNCTION public.notify_urun_status_change();

-- Trigger: new message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  recipient_id uuid;
  conv_rec record;
  sender_firma text;
  msg text;
BEGIN
  SELECT c.user1_id, c.user2_id INTO conv_rec
  FROM public.conversations c WHERE c.id = NEW.conversation_id;

  IF NEW.sender_id = conv_rec.user1_id THEN
    recipient_id := conv_rec.user2_id;
  ELSE
    recipient_id := conv_rec.user1_id;
  END IF;

  SELECT f.firma_unvani INTO sender_firma
  FROM public.firmalar f WHERE f.user_id = NEW.sender_id;

  msg := COALESCE(sender_firma, 'Bir kullanıcı') || ' adlı kullanıcıdan yeni bir mesajınız var.';
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (recipient_id, 'yeni_mesaj', msg, '/mesajlar');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- Enable extensions for cron job
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
