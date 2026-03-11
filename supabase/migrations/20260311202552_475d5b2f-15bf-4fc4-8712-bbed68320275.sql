
-- Create firma_belgeler table for document uploads
CREATE TABLE public.firma_belgeler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id uuid NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  belge_turu text NOT NULL, -- 'vergi_levhasi', 'ticaret_sicil', 'imza_sirkusu'
  dosya_url text NOT NULL,
  dosya_adi text NOT NULL,
  durum text NOT NULL DEFAULT 'inceleniyor', -- 'inceleniyor', 'onaylandi', 'reddedildi'
  karar_sebebi text,
  karar_veren text,
  karar_tarihi timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firma_id, belge_turu)
);

ALTER TABLE public.firma_belgeler ENABLE ROW LEVEL SECURITY;

-- Users can view own documents
CREATE POLICY "Users can view own belgeler" ON public.firma_belgeler
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert own documents
CREATE POLICY "Users can insert own belgeler" ON public.firma_belgeler
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update own documents
CREATE POLICY "Users can update own belgeler" ON public.firma_belgeler
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Users can delete own documents
CREATE POLICY "Users can delete own belgeler" ON public.firma_belgeler
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Storage bucket for firma documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('firma-belgeler', 'firma-belgeler', false);

-- Storage policies
CREATE POLICY "Users can upload own belgeler" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'firma-belgeler' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own belgeler files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'firma-belgeler' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own belgeler files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'firma-belgeler' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Service role can access all (for admin download)
CREATE POLICY "Service role can access all belgeler" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'firma-belgeler');
