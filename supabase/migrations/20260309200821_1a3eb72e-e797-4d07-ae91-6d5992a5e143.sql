
-- Drop old urun_varyasyonlar table and recreate with variant fields + photo
DROP TABLE IF EXISTS public.urun_varyasyonlar;

CREATE TABLE public.urun_varyasyonlar (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  urun_id uuid NOT NULL REFERENCES public.urunler(id) ON DELETE CASCADE,
  varyant_1_label text NOT NULL,
  varyant_1_value text NOT NULL,
  varyant_2_label text,
  varyant_2_value text,
  min_adet integer NOT NULL DEFAULT 1,
  max_adet integer NOT NULL DEFAULT 1,
  birim_fiyat numeric NOT NULL DEFAULT 0,
  foto_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for urun_varyasyonlar
ALTER TABLE public.urun_varyasyonlar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own urun_varyasyonlar"
  ON public.urun_varyasyonlar FOR ALL TO authenticated
  USING (urun_id IN (SELECT id FROM public.urunler WHERE user_id = auth.uid()))
  WITH CHECK (urun_id IN (SELECT id FROM public.urunler WHERE user_id = auth.uid()));

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('urun-images', 'urun-images', true);

-- Storage RLS: anyone can read, only authenticated users can upload/delete their own
CREATE POLICY "Anyone can view urun images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'urun-images');

CREATE POLICY "Authenticated users can upload urun images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'urun-images');

CREATE POLICY "Users can update own urun images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'urun-images');

CREATE POLICY "Users can delete own urun images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'urun-images');
