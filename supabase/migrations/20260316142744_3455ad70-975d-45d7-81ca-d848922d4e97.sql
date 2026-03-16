
CREATE TABLE public.admin_ajanda (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  tarih date NOT NULL,
  icerik text NOT NULL,
  renk text NOT NULL DEFAULT 'blue',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_ajanda ENABLE ROW LEVEL SECURITY;
