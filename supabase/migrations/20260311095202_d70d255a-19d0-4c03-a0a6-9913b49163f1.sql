
-- Firma kısıtlamaları tablosu
CREATE TABLE public.firma_kisitlamalar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sikayet_id UUID REFERENCES public.sikayetler(id) ON DELETE SET NULL,
  sebep TEXT NOT NULL,
  kisitlama_alanlari JSONB NOT NULL DEFAULT '{}'::jsonb,
  bitis_tarihi TIMESTAMP WITH TIME ZONE NOT NULL,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

ALTER TABLE public.firma_kisitlamalar ENABLE ROW LEVEL SECURITY;

-- Firma uzaklaştırmaları tablosu
CREATE TABLE public.firma_uzaklastirmalar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sikayet_id UUID REFERENCES public.sikayetler(id) ON DELETE SET NULL,
  sebep TEXT,
  bitis_tarihi TIMESTAMP WITH TIME ZONE NOT NULL,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

ALTER TABLE public.firma_uzaklastirmalar ENABLE ROW LEVEL SECURITY;

-- Firma yasakları tablosu (blacklist)
CREATE TABLE public.firma_yasaklar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  vergi_numarasi TEXT,
  firma_unvani TEXT,
  sebep TEXT,
  sikayet_id UUID REFERENCES public.sikayetler(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

ALTER TABLE public.firma_yasaklar ENABLE ROW LEVEL SECURITY;
