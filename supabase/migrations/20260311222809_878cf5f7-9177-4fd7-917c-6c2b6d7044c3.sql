
CREATE TABLE public.ihale_ek_dosyalar (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ihale_id uuid NOT NULL REFERENCES public.ihaleler(id) ON DELETE CASCADE,
  dosya_url text NOT NULL,
  dosya_adi text NOT NULL,
  sira integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ihale_ek_dosyalar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ihale owners can manage ek dosyalar"
ON public.ihale_ek_dosyalar
FOR ALL TO authenticated
USING (is_ihale_owner(auth.uid(), ihale_id))
WITH CHECK (is_ihale_owner(auth.uid(), ihale_id));

CREATE POLICY "Users can view ek dosyalar for active ihaleler"
ON public.ihale_ek_dosyalar
FOR SELECT TO authenticated
USING (ihale_id IN (SELECT id FROM public.ihaleler WHERE durum = 'devam_ediyor'));
