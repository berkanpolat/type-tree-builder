
-- Firma bilgi kategorileri (18 ana başlık)
CREATE TABLE public.firma_bilgi_kategorileri (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.firma_bilgi_kategorileri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes kategorileri okuyabilir"
  ON public.firma_bilgi_kategorileri
  FOR SELECT
  USING (true);

-- Firma bilgi seçenekleri (tüm seçenekler, alt seçenekler dahil)
CREATE TABLE public.firma_bilgi_secenekleri (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kategori_id uuid NOT NULL REFERENCES public.firma_bilgi_kategorileri(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.firma_bilgi_secenekleri(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.firma_bilgi_secenekleri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes seçenekleri okuyabilir"
  ON public.firma_bilgi_secenekleri
  FOR SELECT
  USING (true);

CREATE INDEX idx_secenekler_kategori ON public.firma_bilgi_secenekleri(kategori_id);
CREATE INDEX idx_secenekler_parent ON public.firma_bilgi_secenekleri(parent_id);
