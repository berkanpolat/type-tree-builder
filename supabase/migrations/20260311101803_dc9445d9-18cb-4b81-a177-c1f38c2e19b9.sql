
-- Destek talepleri tablosu
CREATE TABLE public.destek_talepleri (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  talep_no TEXT NOT NULL DEFAULT '',
  user_id UUID NOT NULL,
  departman TEXT NOT NULL,
  konu TEXT NOT NULL,
  aciklama TEXT NOT NULL,
  ek_dosya_url TEXT,
  ek_dosya_adi TEXT,
  durum TEXT NOT NULL DEFAULT 'inceleniyor',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Destek mesajları tablosu
CREATE TABLE public.destek_mesajlar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destek_id UUID NOT NULL REFERENCES public.destek_talepleri(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'user',
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  ek_dosya_url TEXT,
  ek_dosya_adi TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Talep numarası oluşturucu trigger
CREATE OR REPLACE FUNCTION public.generate_destek_no()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_no text;
  done bool;
BEGIN
  done := false;
  WHILE NOT done LOOP
    new_no := 'DT-' || upper(substr(md5(random()::text), 1, 6));
    done := NOT EXISTS (SELECT 1 FROM public.destek_talepleri WHERE talep_no = new_no);
  END LOOP;
  NEW.talep_no := new_no;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_destek_no
  BEFORE INSERT ON public.destek_talepleri
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_destek_no();

-- Updated_at trigger
CREATE TRIGGER set_destek_updated_at
  BEFORE UPDATE ON public.destek_talepleri
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.destek_talepleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destek_mesajlar ENABLE ROW LEVEL SECURITY;

-- Users can view own tickets
CREATE POLICY "Users can view own destek" ON public.destek_talepleri
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Users can insert own tickets
CREATE POLICY "Users can insert own destek" ON public.destek_talepleri
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Users can update own tickets (for status changes on reply)
CREATE POLICY "Users can update own destek" ON public.destek_talepleri
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Users can view messages of own tickets
CREATE POLICY "Users can view own destek mesajlar" ON public.destek_mesajlar
  FOR SELECT TO authenticated USING (
    destek_id IN (SELECT id FROM public.destek_talepleri WHERE user_id = auth.uid())
  );

-- Users can insert messages to own tickets
CREATE POLICY "Users can insert own destek mesajlar" ON public.destek_mesajlar
  FOR INSERT TO authenticated WITH CHECK (
    destek_id IN (SELECT id FROM public.destek_talepleri WHERE user_id = auth.uid())
  );

-- Enable realtime for destek_mesajlar
ALTER PUBLICATION supabase_realtime ADD TABLE public.destek_mesajlar;
ALTER PUBLICATION supabase_realtime ADD TABLE public.destek_talepleri;
