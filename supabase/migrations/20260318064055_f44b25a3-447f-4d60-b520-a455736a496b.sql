
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  seviye text NOT NULL DEFAULT 'info',
  kaynak text NOT NULL,
  islem text NOT NULL,
  mesaj text NOT NULL,
  detaylar jsonb DEFAULT '{}'::jsonb,
  user_id uuid NULL,
  firma_id uuid NULL,
  ip_address text NULL,
  basarili boolean NOT NULL DEFAULT true,
  hata_mesaji text NULL
);

CREATE INDEX idx_system_logs_created_at ON public.system_logs (created_at DESC);
CREATE INDEX idx_system_logs_kaynak ON public.system_logs (kaynak);
CREATE INDEX idx_system_logs_seviye ON public.system_logs (seviye);
CREATE INDEX idx_system_logs_basarili ON public.system_logs (basarili);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
