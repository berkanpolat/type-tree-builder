
CREATE TABLE public.admin_portfolyo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  firma_id uuid NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (firma_id)
);

ALTER TABLE public.admin_portfolyo ENABLE ROW LEVEL SECURITY;
