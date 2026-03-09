
-- Add number and single-select columns to firmalar
ALTER TABLE public.firmalar
  ADD COLUMN IF NOT EXISTS moq integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS aylik_uretim_kapasitesi integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS uretim_vardiyasi_id uuid REFERENCES public.firma_bilgi_secenekleri(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bagimsiz_denetim_id uuid REFERENCES public.firma_bilgi_secenekleri(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hizli_numune_id uuid REFERENCES public.firma_bilgi_secenekleri(id) DEFAULT NULL;

-- Junction table for multi-select fields
CREATE TABLE IF NOT EXISTS public.firma_urun_hizmet_secimler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id uuid NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  kategori_id uuid NOT NULL REFERENCES public.firma_bilgi_kategorileri(id),
  secenek_id uuid NOT NULL REFERENCES public.firma_bilgi_secenekleri(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firma_id, kategori_id, secenek_id)
);

ALTER TABLE public.firma_urun_hizmet_secimler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own selections"
ON public.firma_urun_hizmet_secimler FOR SELECT
TO authenticated
USING (firma_id IN (SELECT id FROM public.firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own selections"
ON public.firma_urun_hizmet_secimler FOR INSERT
TO authenticated
WITH CHECK (firma_id IN (SELECT id FROM public.firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own selections"
ON public.firma_urun_hizmet_secimler FOR DELETE
TO authenticated
USING (firma_id IN (SELECT id FROM public.firmalar WHERE user_id = auth.uid()));

-- Faaliyet Alanı (Tedarikçi) category
INSERT INTO public.firma_bilgi_kategorileri (id, name, format)
VALUES ('a0000001-0000-0000-0000-000000000013', 'Faaliyet Alanı (Tedarikçi)', 'text')
ON CONFLICT (id) DO NOTHING;

-- Options for Faaliyet Alanı (Tedarikçi)
INSERT INTO public.firma_bilgi_secenekleri (kategori_id, name) VALUES
('a0000001-0000-0000-0000-000000000013', 'Kumaş'),
('a0000001-0000-0000-0000-000000000013', 'İplik'),
('a0000001-0000-0000-0000-000000000013', 'Aksesuar'),
('a0000001-0000-0000-0000-000000000013', 'Kimyasal'),
('a0000001-0000-0000-0000-000000000013', 'Ambalaj'),
('a0000001-0000-0000-0000-000000000013', 'Makine ve Ekipman'),
('a0000001-0000-0000-0000-000000000013', 'Boya ve Baskı'),
('a0000001-0000-0000-0000-000000000013', 'Etiket'),
('a0000001-0000-0000-0000-000000000013', 'Diğer');
