
CREATE TABLE public.admin_ziyaret_planlari (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  firma_id UUID NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  planlanan_tarih DATE NOT NULL,
  notlar TEXT,
  durum TEXT NOT NULL DEFAULT 'planli',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_ziyaret_planlari ENABLE ROW LEVEL SECURITY;
