
-- Sertifikalar tablosu
CREATE TABLE public.firma_sertifikalar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id uuid NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  sertifika_kategori_id uuid NOT NULL REFERENCES public.firma_bilgi_secenekleri(id),
  sertifika_tur_id uuid NOT NULL REFERENCES public.firma_bilgi_secenekleri(id),
  verilis_tarihi date,
  gecerlilik_tarihi date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.firma_sertifikalar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sertifikalar" ON public.firma_sertifikalar
  FOR SELECT TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own sertifikalar" ON public.firma_sertifikalar
  FOR INSERT TO authenticated
  WITH CHECK (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own sertifikalar" ON public.firma_sertifikalar
  FOR UPDATE TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own sertifikalar" ON public.firma_sertifikalar
  FOR DELETE TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

-- Referanslar tablosu
CREATE TABLE public.firma_referanslar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id uuid NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  referans_adi text NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.firma_referanslar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referanslar" ON public.firma_referanslar
  FOR SELECT TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own referanslar" ON public.firma_referanslar
  FOR INSERT TO authenticated
  WITH CHECK (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own referanslar" ON public.firma_referanslar
  FOR UPDATE TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own referanslar" ON public.firma_referanslar
  FOR DELETE TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

-- Referans logoları için storage policy (firma-images bucket zaten var)
CREATE POLICY "Users can upload referans logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'firma-images' AND (storage.foldername(name))[1] = 'referanslar');

CREATE POLICY "Users can view referans logos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'firma-images' AND (storage.foldername(name))[1] = 'referanslar');

CREATE POLICY "Users can delete referans logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'firma-images' AND (storage.foldername(name))[1] = 'referanslar');
