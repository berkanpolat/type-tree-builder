
CREATE TABLE public.firma_yetkililer (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firma_id UUID NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.admin_users(id),
  ad TEXT NOT NULL,
  soyad TEXT NOT NULL,
  pozisyon TEXT,
  email TEXT,
  telefon TEXT,
  dahili_no TEXT,
  il TEXT,
  ilce TEXT,
  linkedin TEXT,
  aciklama TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.firma_yetkililer ENABLE ROW LEVEL SECURITY;
