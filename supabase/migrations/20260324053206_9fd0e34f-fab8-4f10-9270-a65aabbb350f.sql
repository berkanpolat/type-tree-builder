
CREATE TABLE public.releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versiyon text NOT NULL,
  baslik text NOT NULL DEFAULT '',
  aciklama text NOT NULL DEFAULT '',
  degisiklikler jsonb DEFAULT '[]'::jsonb,
  admin_id uuid REFERENCES public.admin_users(id) NOT NULL,
  admin_ad text NOT NULL DEFAULT '',
  ortam text NOT NULL DEFAULT 'production',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
