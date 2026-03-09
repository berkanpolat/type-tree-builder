
CREATE TABLE public.firma_galeri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id uuid NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  foto_url text NOT NULL,
  foto_adi text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.firma_galeri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own galeri" ON public.firma_galeri
  FOR SELECT TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own galeri" ON public.firma_galeri
  FOR INSERT TO authenticated
  WITH CHECK (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own galeri" ON public.firma_galeri
  FOR UPDATE TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own galeri" ON public.firma_galeri
  FOR DELETE TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

-- Storage policies for galeri folder
CREATE POLICY "Users can upload galeri photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'firma-images' AND (storage.foldername(name))[1] = 'galeri');

CREATE POLICY "Users can view galeri photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'firma-images' AND (storage.foldername(name))[1] = 'galeri');

CREATE POLICY "Users can delete galeri photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'firma-images' AND (storage.foldername(name))[1] = 'galeri');
