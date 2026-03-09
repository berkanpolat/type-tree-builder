
-- Ürünler tablosu
CREATE TABLE public.urunler (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  urun_no text NOT NULL,
  baslik text NOT NULL,
  aciklama text,
  urun_kategori_id uuid REFERENCES public.firma_bilgi_secenekleri(id),
  urun_grup_id uuid REFERENCES public.firma_bilgi_secenekleri(id),
  urun_tur_id uuid REFERENCES public.firma_bilgi_secenekleri(id),
  fiyat_tipi text NOT NULL DEFAULT 'tek_fiyat',
  fiyat numeric,
  para_birimi text DEFAULT 'TRY',
  min_siparis_miktari integer,
  foto_url text,
  durum text NOT NULL DEFAULT 'taslak',
  teknik_detaylar jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Ürün varyasyonları tablosu
CREATE TABLE public.urun_varyasyonlar (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  urun_id uuid NOT NULL REFERENCES public.urunler(id) ON DELETE CASCADE,
  min_adet integer NOT NULL,
  max_adet integer NOT NULL,
  birim_fiyat numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Auto-generate urun_no trigger
CREATE OR REPLACE FUNCTION public.generate_urun_no()
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
    new_no := '#' || lpad(floor(random() * 100000000)::text, 8, '0');
    done := NOT EXISTS (SELECT 1 FROM public.urunler WHERE urun_no = new_no);
  END LOOP;
  NEW.urun_no := new_no;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_urun_no
  BEFORE INSERT ON public.urunler
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_urun_no();

-- Updated_at trigger
CREATE TRIGGER set_urunler_updated_at
  BEFORE UPDATE ON public.urunler
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for urunler
ALTER TABLE public.urunler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own urunler"
  ON public.urunler FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own urunler"
  ON public.urunler FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own urunler"
  ON public.urunler FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own urunler"
  ON public.urunler FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS for urun_varyasyonlar
ALTER TABLE public.urun_varyasyonlar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own urun_varyasyonlar"
  ON public.urun_varyasyonlar FOR ALL TO authenticated
  USING (urun_id IN (SELECT id FROM public.urunler WHERE user_id = auth.uid()))
  WITH CHECK (urun_id IN (SELECT id FROM public.urunler WHERE user_id = auth.uid()));
