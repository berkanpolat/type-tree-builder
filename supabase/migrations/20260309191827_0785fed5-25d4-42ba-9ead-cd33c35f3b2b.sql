
-- Update ihaleler table with new columns
ALTER TABLE public.ihaleler
  ADD COLUMN IF NOT EXISTS ihale_turu text NOT NULL DEFAULT 'urun_alis',
  ADD COLUMN IF NOT EXISTS aciklama text,
  ADD COLUMN IF NOT EXISTS baslangic_fiyati numeric,
  ADD COLUMN IF NOT EXISTS para_birimi text DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS kdv_durumu text,
  ADD COLUMN IF NOT EXISTS odeme_secenekleri text,
  ADD COLUMN IF NOT EXISTS odeme_vadesi text,
  ADD COLUMN IF NOT EXISTS kargo_masrafi text,
  ADD COLUMN IF NOT EXISTS kargo_sirketi_anlasmasi text,
  ADD COLUMN IF NOT EXISTS teslimat_tarihi timestamp with time zone,
  ADD COLUMN IF NOT EXISTS teslimat_yeri text,
  ADD COLUMN IF NOT EXISTS ozel_filtreleme boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS firma_adi_gizle boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_teklif_degisim numeric,
  ADD COLUMN IF NOT EXISTS urun_kategori_id uuid,
  ADD COLUMN IF NOT EXISTS urun_grup_id uuid,
  ADD COLUMN IF NOT EXISTS urun_tur_id uuid,
  ADD COLUMN IF NOT EXISTS hizmet_kategori_id uuid,
  ADD COLUMN IF NOT EXISTS hizmet_tur_id uuid,
  ADD COLUMN IF NOT EXISTS teknik_detaylar jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ek_dosya_url text;

-- Create ihale_filtreler table
CREATE TABLE IF NOT EXISTS public.ihale_filtreler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ihale_id uuid NOT NULL REFERENCES public.ihaleler(id) ON DELETE CASCADE,
  filtre_tipi text NOT NULL,
  secenek_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ihale_filtreler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ihale owners can manage filtreler" ON public.ihale_filtreler
  FOR ALL TO authenticated
  USING (ihale_id IN (SELECT id FROM public.ihaleler WHERE user_id = auth.uid()))
  WITH CHECK (ihale_id IN (SELECT id FROM public.ihaleler WHERE user_id = auth.uid()));

-- Create ihale_stok table
CREATE TABLE IF NOT EXISTS public.ihale_stok (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ihale_id uuid NOT NULL REFERENCES public.ihaleler(id) ON DELETE CASCADE,
  varyant_1_label text NOT NULL,
  varyant_1_value text NOT NULL,
  varyant_2_label text,
  varyant_2_value text,
  miktar_tipi text NOT NULL DEFAULT 'Adet',
  stok_sayisi integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ihale_stok ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ihale owners can manage stok" ON public.ihale_stok
  FOR ALL TO authenticated
  USING (ihale_id IN (SELECT id FROM public.ihaleler WHERE user_id = auth.uid()))
  WITH CHECK (ihale_id IN (SELECT id FROM public.ihaleler WHERE user_id = auth.uid()));

-- Create storage bucket for ihale files
INSERT INTO storage.buckets (id, name, public) VALUES ('ihale-files', 'ihale-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload ihale files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ihale-files');

CREATE POLICY "Anyone can view ihale files" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'ihale-files');

CREATE POLICY "Users can delete own ihale files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ihale-files' AND (storage.foldername(name))[1] = auth.uid()::text);
