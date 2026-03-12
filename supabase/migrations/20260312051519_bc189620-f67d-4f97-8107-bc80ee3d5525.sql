
-- Add slug column to firmalar
ALTER TABLE public.firmalar ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Function to generate a URL-friendly slug from Turkish text
CREATE OR REPLACE FUNCTION public.generate_firma_slug(p_unvani text)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 1;
  reserved_words text[] := ARRAY[
    'dashboard', 'anasayfa', 'firmalar', 'urunler', 'ihaleler',
    'tekrehber', 'manupazar', 'tekihale', 'manuihale', 'manuihale',
    'giris-kayit', 'hakkimizda', 'iletisim', 'sss', 'favoriler',
    'mesajlar', 'bildirimler', 'paketim', 'destek', 'ayarlar',
    'profil-ayarlari', 'sifre-sifirla', 'yonetim', 'test-index',
    'tekliflerim', 'urun', 'firma', 'urun-bilgileri', 'hizmet-bilgileri',
    'urun-kategorisi', 'firma-bilgilerim', 'gizlilik-kosullari',
    'kvkk-aydinlatma', 'kullanim-kosullari', 'mesafeli-satis-sozlesmesi',
    'tekihale-tanitim', 'tekpazar-tanitim', 'uretici-tedarikci-kesfi',
    'robots.txt', 'sitemap.xml', 'api', 'admin', 'auth', 'login',
    'register', 'signup', 'signin'
  ];
BEGIN
  -- Transliterate Turkish characters and normalize
  base_slug := lower(p_unvani);
  base_slug := replace(base_slug, 'ç', 'c');
  base_slug := replace(base_slug, 'ğ', 'g');
  base_slug := replace(base_slug, 'ı', 'i');
  base_slug := replace(base_slug, 'İ', 'i');
  base_slug := replace(base_slug, 'ö', 'o');
  base_slug := replace(base_slug, 'ş', 's');
  base_slug := replace(base_slug, 'ü', 'u');
  base_slug := replace(base_slug, 'Ç', 'c');
  base_slug := replace(base_slug, 'Ğ', 'g');
  base_slug := replace(base_slug, 'Ö', 'o');
  base_slug := replace(base_slug, 'Ş', 's');
  base_slug := replace(base_slug, 'Ü', 'u');
  -- Remove special characters, keep alphanumeric and spaces
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  -- Replace spaces with hyphens
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  -- Remove consecutive hyphens
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  -- Trim hyphens from start/end
  base_slug := trim(both '-' from base_slug);
  
  -- If empty, use a fallback
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'firma';
  END IF;
  
  final_slug := base_slug;
  
  -- Check reserved words
  IF final_slug = ANY(reserved_words) THEN
    final_slug := base_slug || '-1';
    counter := 2;
  END IF;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.firmalar WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Trigger function to auto-set slug on insert/update
CREATE OR REPLACE FUNCTION public.set_firma_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Only generate slug if it's null or firma_unvani changed
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND OLD.firma_unvani IS DISTINCT FROM NEW.firma_unvani) THEN
    NEW.slug := public.generate_firma_slug(NEW.firma_unvani);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_set_firma_slug ON public.firmalar;
CREATE TRIGGER trg_set_firma_slug
  BEFORE INSERT OR UPDATE ON public.firmalar
  FOR EACH ROW
  EXECUTE FUNCTION public.set_firma_slug();

-- Populate slugs for existing rows
UPDATE public.firmalar SET slug = public.generate_firma_slug(firma_unvani) WHERE slug IS NULL;
