
-- 1. Paketler tablosu
CREATE TABLE public.paketler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad text NOT NULL,
  slug text NOT NULL UNIQUE,
  profil_goruntuleme_limiti integer, -- null = sınırsız
  ihale_acma_limiti integer, -- null = sınırsız
  teklif_verme_limiti integer, -- null = sınırsız
  aktif_urun_limiti integer NOT NULL DEFAULT 5,
  mesaj_limiti integer, -- 0 = sadece yanıt, null = sınırsız
  fiyat_aylik numeric DEFAULT 0,
  fiyat_yillik numeric DEFAULT 0,
  para_birimi text NOT NULL DEFAULT 'USD',
  stripe_price_aylik_id text,
  stripe_price_yillik_id text,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paketler ENABLE ROW LEVEL SECURITY;

-- Herkes paketleri okuyabilir
CREATE POLICY "Herkes paketleri okuyabilir" ON public.paketler
  FOR SELECT TO public USING (true);

-- 2. Kullanıcı Abonelikler tablosu
CREATE TABLE public.kullanici_abonelikler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  paket_id uuid NOT NULL REFERENCES public.paketler(id),
  periyot text NOT NULL DEFAULT 'aylik', -- aylik / yillik
  donem_baslangic timestamptz NOT NULL DEFAULT now(),
  donem_bitis timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  durum text NOT NULL DEFAULT 'aktif', -- aktif, suresi_dolmus, iptal
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kullanici_abonelikler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.kullanici_abonelikler
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own subscription" ON public.kullanici_abonelikler
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- 3. Profil Görüntülemeler tablosu (hangi firmaları görüntüledi)
CREATE TABLE public.profil_goruntulemeler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  firma_id uuid NOT NULL REFERENCES public.firmalar(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profil_goruntulemeler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile views" ON public.profil_goruntulemeler
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile views" ON public.profil_goruntulemeler
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Aynı firmayı aynı dönemde tekrar eklemeyi engellemek için unique index
CREATE UNIQUE INDEX idx_profil_goruntulemeler_unique ON public.profil_goruntulemeler(user_id, firma_id);

-- 4. Varsayılan paketleri ekle
INSERT INTO public.paketler (ad, slug, profil_goruntuleme_limiti, ihale_acma_limiti, teklif_verme_limiti, aktif_urun_limiti, mesaj_limiti, fiyat_aylik, fiyat_yillik, stripe_price_aylik_id, stripe_price_yillik_id)
VALUES 
  ('Ücretsiz', 'ucretsiz', 5, NULL, 1, 5, 0, 0, 0, NULL, NULL),
  ('PRO', 'pro', NULL, NULL, NULL, 30, 50, 199, 1299, 'price_1T9kVU16sgu1Ou2XJkpzKddd', 'price_1T9kVs16sgu1Ou2X9S0sStli');

-- 5. Kayıt olan kullanıcılara otomatik ücretsiz paket atama trigger'ı
CREATE OR REPLACE FUNCTION public.auto_assign_free_package()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  free_paket_id uuid;
BEGIN
  SELECT id INTO free_paket_id FROM public.paketler WHERE slug = 'ucretsiz' LIMIT 1;
  
  IF free_paket_id IS NOT NULL THEN
    INSERT INTO public.kullanici_abonelikler (user_id, paket_id, periyot, donem_baslangic, donem_bitis, durum)
    VALUES (NEW.user_id, free_paket_id, 'aylik', now(), now() + interval '1 month', 'aktif')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_free_package
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_free_package();

-- 6. updated_at trigger for kullanici_abonelikler
CREATE TRIGGER trg_kullanici_abonelikler_updated_at
  BEFORE UPDATE ON public.kullanici_abonelikler
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
