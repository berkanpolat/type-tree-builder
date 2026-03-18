
CREATE TABLE public.seo_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sayfa_slug text NOT NULL UNIQUE,
  sayfa_adi text NOT NULL,
  sayfa_tipi text NOT NULL DEFAULT 'statik',
  title text,
  description text,
  keywords text,
  og_title text,
  og_description text,
  og_image text,
  canonical_url text,
  robots text DEFAULT 'index, follow',
  json_ld jsonb,
  h1_text text,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes seo_meta okuyabilir" ON public.seo_meta
  FOR SELECT TO public USING (true);

CREATE TRIGGER update_seo_meta_updated_at
  BEFORE UPDATE ON public.seo_meta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
