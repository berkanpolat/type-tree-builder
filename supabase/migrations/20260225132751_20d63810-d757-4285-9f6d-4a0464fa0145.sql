
-- Firma Türleri tablosu
CREATE TABLE public.firma_turleri (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.firma_turleri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes firma türlerini okuyabilir"
  ON public.firma_turleri
  FOR SELECT
  USING (true);

-- Firma Tipleri tablosu
CREATE TABLE public.firma_tipleri (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firma_turu_id UUID NOT NULL REFERENCES public.firma_turleri(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.firma_tipleri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes firma tiplerini okuyabilir"
  ON public.firma_tipleri
  FOR SELECT
  USING (true);

-- Index for faster lookups
CREATE INDEX idx_firma_tipleri_turu_id ON public.firma_tipleri(firma_turu_id);
