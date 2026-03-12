
CREATE TABLE public.odeme_kayitlari (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  merchant_oid text NOT NULL UNIQUE,
  periyot text NOT NULL DEFAULT 'aylik',
  tutar_kurus integer NOT NULL DEFAULT 0,
  durum text NOT NULL DEFAULT 'bekliyor',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.odeme_kayitlari ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment records"
  ON public.odeme_kayitlari
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
