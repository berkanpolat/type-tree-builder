
-- Firma favorileri tablosu
CREATE TABLE public.firma_favoriler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  firma_id uuid NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, firma_id)
);

ALTER TABLE public.firma_favoriler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own firma favoriler" ON public.firma_favoriler
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own firma favoriler" ON public.firma_favoriler
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own firma favoriler" ON public.firma_favoriler
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Ürün favorileri tablosu
CREATE TABLE public.urun_favoriler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  urun_id uuid NOT NULL REFERENCES public.urunler(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, urun_id)
);

ALTER TABLE public.urun_favoriler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own urun favoriler" ON public.urun_favoriler
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own urun favoriler" ON public.urun_favoriler
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own urun favoriler" ON public.urun_favoriler
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Firmalar tablosunu herkes görebilmeli (profil görüntüleme için)
CREATE POLICY "Authenticated users can view all firmalar" ON public.firmalar
  FOR SELECT TO authenticated USING (true);

-- Ürünleri aktif olanları herkes görebilmeli
CREATE POLICY "Authenticated users can view active urunler" ON public.urunler
  FOR SELECT TO authenticated USING (durum = 'aktif' OR auth.uid() = user_id);
