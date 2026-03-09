ALTER TABLE public.firmalar
  ADD COLUMN IF NOT EXISTS firma_olcegi_id uuid REFERENCES public.firma_bilgi_secenekleri(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS kurulus_tarihi text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS kurulus_il_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS kurulus_ilce_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS web_sitesi text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS firma_iletisim_numarasi text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS firma_iletisim_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS instagram text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS facebook text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linkedin text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS x_twitter text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tiktok text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS kapak_fotografi_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS firma_hakkinda text DEFAULT NULL;

-- Storage bucket for firma images
INSERT INTO storage.buckets (id, name, public)
VALUES ('firma-images', 'firma-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for firma-images bucket: users can upload/update/delete their own files
CREATE POLICY "Users can upload firma images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'firma-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own firma images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'firma-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own firma images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'firma-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view firma images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'firma-images');