
CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  INSERT INTO public.notifications (user_id, type, message, link, reference_id)
  VALUES (recipient_id, 'yeni_mesaj', msg, '/mesajlar?conv=' || NEW.conversation_id, NEW.conversation_id::text);

  RETURN NEW;
END;
$$;
