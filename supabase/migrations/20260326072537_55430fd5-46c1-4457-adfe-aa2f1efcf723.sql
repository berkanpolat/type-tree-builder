
-- Add slug columns
ALTER TABLE public.firma_bilgi_secenekleri ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.firma_turleri ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.firma_tipleri ADD COLUMN IF NOT EXISTS slug text;

-- Create a Turkish-aware slugify function
CREATE OR REPLACE FUNCTION public.slugify_tr(input text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  result text;
BEGIN
  result := lower(input);
  result := replace(result, 'ı', 'i');
  result := replace(result, 'ğ', 'g');
  result := replace(result, 'ü', 'u');
  result := replace(result, 'ş', 's');
  result := replace(result, 'ö', 'o');
  result := replace(result, 'ç', 'c');
  result := replace(result, 'İ', 'i');
  result := replace(result, 'Ğ', 'g');
  result := replace(result, 'Ü', 'u');
  result := replace(result, 'Ş', 's');
  result := replace(result, 'Ö', 'o');
  result := replace(result, 'Ç', 'c');
  -- Replace special chars with hyphens
  result := regexp_replace(result, '[^a-z0-9\-]', '-', 'g');
  -- Collapse multiple hyphens
  result := regexp_replace(result, '-+', '-', 'g');
  -- Trim hyphens
  result := trim(both '-' from result);
  RETURN result;
END;
$$;

-- Populate slugs for firma_bilgi_secenekleri
UPDATE public.firma_bilgi_secenekleri SET slug = slugify_tr(name) WHERE slug IS NULL;

-- Populate slugs for firma_turleri
UPDATE public.firma_turleri SET slug = slugify_tr(name) WHERE slug IS NULL;

-- Populate slugs for firma_tipleri
UPDATE public.firma_tipleri SET slug = slugify_tr(name) WHERE slug IS NULL;
