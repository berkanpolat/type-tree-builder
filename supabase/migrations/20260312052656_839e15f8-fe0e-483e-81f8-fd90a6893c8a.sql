
-- Add slug column to urunler
ALTER TABLE public.urunler ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Add slug column to ihaleler
ALTER TABLE public.ihaleler ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Function to generate a URL-friendly slug (generic)
CREATE OR REPLACE FUNCTION public.generate_slug(p_text text, p_table text, p_existing_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 1;
  slug_exists boolean;
BEGIN
  base_slug := lower(p_text);
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
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := p_table;
  END IF;
  
  -- Truncate to reasonable length
  base_slug := left(base_slug, 80);
  
  final_slug := base_slug;
  
  -- Ensure uniqueness within the target table
  LOOP
    IF p_table = 'urunler' THEN
      SELECT EXISTS (SELECT 1 FROM public.urunler WHERE slug = final_slug AND (p_existing_id IS NULL OR id != p_existing_id)) INTO slug_exists;
    ELSIF p_table = 'ihaleler' THEN
      SELECT EXISTS (SELECT 1 FROM public.ihaleler WHERE slug = final_slug AND (p_existing_id IS NULL OR id != p_existing_id)) INTO slug_exists;
    ELSE
      slug_exists := false;
    END IF;
    
    EXIT WHEN NOT slug_exists;
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Trigger function for urunler
CREATE OR REPLACE FUNCTION public.set_urun_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND OLD.baslik IS DISTINCT FROM NEW.baslik) THEN
    NEW.slug := public.generate_slug(NEW.baslik, 'urunler', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function for ihaleler
CREATE OR REPLACE FUNCTION public.set_ihale_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND OLD.baslik IS DISTINCT FROM NEW.baslik) THEN
    NEW.slug := public.generate_slug(NEW.baslik, 'ihaleler', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trg_set_urun_slug ON public.urunler;
CREATE TRIGGER trg_set_urun_slug
  BEFORE INSERT OR UPDATE ON public.urunler
  FOR EACH ROW EXECUTE FUNCTION public.set_urun_slug();

DROP TRIGGER IF EXISTS trg_set_ihale_slug ON public.ihaleler;
CREATE TRIGGER trg_set_ihale_slug
  BEFORE INSERT OR UPDATE ON public.ihaleler
  FOR EACH ROW EXECUTE FUNCTION public.set_ihale_slug();

-- Populate existing rows
UPDATE public.urunler SET slug = public.generate_slug(baslik, 'urunler', id) WHERE slug IS NULL;
UPDATE public.ihaleler SET slug = public.generate_slug(baslik, 'ihaleler', id) WHERE slug IS NULL;
