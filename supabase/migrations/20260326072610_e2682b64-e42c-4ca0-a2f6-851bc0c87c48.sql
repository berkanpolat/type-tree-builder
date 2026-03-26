
-- Fix slugs that start with 'i-' (from İ character issues)
UPDATE public.firma_bilgi_secenekleri 
SET slug = regexp_replace(slug, '^i-', 'i', 'g')
WHERE slug LIKE 'i-%';

UPDATE public.firma_tipleri 
SET slug = regexp_replace(slug, '^i-', 'i', 'g')
WHERE slug LIKE 'i-%';

-- Also fix the slugify function for İ
CREATE OR REPLACE FUNCTION public.slugify_tr(input text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  result text;
BEGIN
  result := input;
  -- Handle Turkish uppercase first
  result := replace(result, 'İ', 'i');
  result := replace(result, 'Ğ', 'g');
  result := replace(result, 'Ü', 'u');
  result := replace(result, 'Ş', 's');
  result := replace(result, 'Ö', 'o');
  result := replace(result, 'Ç', 'c');
  result := lower(result);
  result := replace(result, 'ı', 'i');
  result := replace(result, 'ğ', 'g');
  result := replace(result, 'ü', 'u');
  result := replace(result, 'ş', 's');
  result := replace(result, 'ö', 'o');
  result := replace(result, 'ç', 'c');
  -- Replace special chars with hyphens
  result := regexp_replace(result, '[^a-z0-9\-]', '-', 'g');
  -- Collapse multiple hyphens
  result := regexp_replace(result, '-+', '-', 'g');
  -- Trim hyphens
  result := trim(both '-' from result);
  RETURN result;
END;
$$;
