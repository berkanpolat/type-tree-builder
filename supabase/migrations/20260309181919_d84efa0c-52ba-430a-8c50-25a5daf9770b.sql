
-- Table for machines
CREATE TABLE public.firma_makineler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id uuid NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  makine_kategori_id uuid NOT NULL REFERENCES public.firma_bilgi_secenekleri(id),
  makine_tur_id uuid NOT NULL REFERENCES public.firma_bilgi_secenekleri(id),
  makine_sayisi text,
  tesis_id uuid REFERENCES public.firma_tesisler(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.firma_makineler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own makineler" ON public.firma_makineler
  FOR SELECT TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own makineler" ON public.firma_makineler
  FOR INSERT TO authenticated
  WITH CHECK (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own makineler" ON public.firma_makineler
  FOR UPDATE TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own makineler" ON public.firma_makineler
  FOR DELETE TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

-- Table for technologies
CREATE TABLE public.firma_teknolojiler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id uuid NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  teknoloji_kategori_id uuid NOT NULL REFERENCES public.firma_bilgi_secenekleri(id),
  teknoloji_tur_id uuid NOT NULL REFERENCES public.firma_bilgi_secenekleri(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.firma_teknolojiler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own teknolojiler" ON public.firma_teknolojiler
  FOR SELECT TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own teknolojiler" ON public.firma_teknolojiler
  FOR INSERT TO authenticated
  WITH CHECK (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own teknolojiler" ON public.firma_teknolojiler
  FOR UPDATE TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own teknolojiler" ON public.firma_teknolojiler
  FOR DELETE TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));
