CREATE TABLE public.admin_aksiyonlar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id uuid NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  baslik text NOT NULL,
  aciklama text,
  tur text NOT NULL DEFAULT 'diger',
  tarih timestamp with time zone NOT NULL DEFAULT now(),
  durum text NOT NULL DEFAULT 'yapilacak',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_aksiyonlar ENABLE ROW LEVEL SECURITY;