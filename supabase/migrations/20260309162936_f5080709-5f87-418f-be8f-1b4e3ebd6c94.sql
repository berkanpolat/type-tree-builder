
-- Add role column to firmalar
ALTER TABLE public.firmalar ADD COLUMN IF NOT EXISTS uretim_satis_rolu text;

-- Create table for production/sales product selections
CREATE TABLE public.firma_uretim_satis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id uuid NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  tip text NOT NULL, -- 'uretim' or 'satis'
  kategori_id uuid NOT NULL REFERENCES public.firma_bilgi_secenekleri(id),
  grup_id uuid NOT NULL REFERENCES public.firma_bilgi_secenekleri(id),
  tur_id uuid NOT NULL REFERENCES public.firma_bilgi_secenekleri(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firma_id, tip, tur_id)
);

ALTER TABLE public.firma_uretim_satis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own uretim_satis"
  ON public.firma_uretim_satis FOR SELECT TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own uretim_satis"
  ON public.firma_uretim_satis FOR INSERT TO authenticated
  WITH CHECK (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own uretim_satis"
  ON public.firma_uretim_satis FOR DELETE TO authenticated
  USING (firma_id IN (SELECT id FROM firmalar WHERE user_id = auth.uid()));
