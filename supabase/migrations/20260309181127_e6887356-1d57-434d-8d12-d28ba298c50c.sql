
CREATE TABLE public.firma_tesisler (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firma_id uuid NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  tesis_adi_id uuid NOT NULL REFERENCES public.firma_bilgi_secenekleri(id),
  tesis_adresi text,
  il_id uuid REFERENCES public.firma_bilgi_secenekleri(id),
  ilce_id uuid REFERENCES public.firma_bilgi_secenekleri(id),
  is_gucu_id uuid REFERENCES public.firma_bilgi_secenekleri(id),
  makine_gucu text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.firma_tesisler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tesisler" ON public.firma_tesisler
  FOR SELECT TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own tesisler" ON public.firma_tesisler
  FOR INSERT TO authenticated
  WITH CHECK (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own tesisler" ON public.firma_tesisler
  FOR UPDATE TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own tesisler" ON public.firma_tesisler
  FOR DELETE TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));
