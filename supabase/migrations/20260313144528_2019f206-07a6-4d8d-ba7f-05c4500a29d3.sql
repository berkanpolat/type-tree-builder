
-- Chatbot knowledge base (FAQ entries)
CREATE TABLE public.chatbot_bilgi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soru text NOT NULL,
  cevap text NOT NULL,
  kategori text NOT NULL DEFAULT 'Genel',
  aktif boolean NOT NULL DEFAULT true,
  sira integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Chatbot config (system instructions, rules)
CREATE TABLE public.chatbot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anahtar text NOT NULL UNIQUE,
  deger text NOT NULL,
  aciklama text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS needed - these are public read tables managed by admin via edge function
ALTER TABLE public.chatbot_bilgi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_config ENABLE ROW LEVEL SECURITY;

-- Public read for edge function (anon key)
CREATE POLICY "Herkes chatbot bilgilerini okuyabilir" ON public.chatbot_bilgi FOR SELECT TO public USING (true);
CREATE POLICY "Herkes chatbot config okuyabilir" ON public.chatbot_config FOR SELECT TO public USING (true);

-- Insert default config
INSERT INTO public.chatbot_config (anahtar, deger, aciklama) VALUES
('sistem_talimatlari', '', 'Botun ek sistem talimatları. Ana prompt''a eklenir.'),
('yasak_konular', 'Genel bilgi soruları, Hava durumu, Tarih soruları, Matematik, Kodlama, Sağlık tavsiyeleri, Spor, Politika, Eğlence', 'Botun cevap vermemesi gereken konular (virgülle ayırın).');
