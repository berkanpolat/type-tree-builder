
CREATE TABLE public.lead_basvurular (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad TEXT NOT NULL,
  soyad TEXT NOT NULL,
  email TEXT NOT NULL,
  telefon TEXT NOT NULL,
  kaynak TEXT NOT NULL DEFAULT 'genel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_basvurular ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes lead ekleyebilir" ON public.lead_basvurular
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admin lead okuyabilir" ON public.lead_basvurular
  FOR SELECT TO authenticated USING (true);
