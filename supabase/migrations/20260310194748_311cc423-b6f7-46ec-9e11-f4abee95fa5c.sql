
-- Admin users table for the super admin panel (separate from site users)
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  ad text NOT NULL,
  soyad text NOT NULL,
  email text,
  telefon text,
  pozisyon text NOT NULL DEFAULT 'Yönetici',
  is_primary boolean NOT NULL DEFAULT false,
  permissions jsonb NOT NULL DEFAULT '{
    "kullanici_ekle": true,
    "kullanici_yonet": true,
    "destek_talepleri": true,
    "sikayet_goruntule": true,
    "ihale_goruntule": true,
    "urun_goruntule": true
  }'::jsonb,
  created_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- No direct RLS policies for regular users - access only via edge functions with service role

-- Seed the primary admin user (password: 345834 hashed with pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.admin_users (username, password_hash, ad, soyad, pozisyon, is_primary, permissions)
VALUES (
  '34361510',
  crypt('345834', gen_salt('bf')),
  'Ana',
  'Yönetici',
  'Yönetici',
  true,
  '{
    "kullanici_ekle": true,
    "kullanici_yonet": true,
    "destek_talepleri": true,
    "sikayet_goruntule": true,
    "ihale_goruntule": true,
    "urun_goruntule": true
  }'::jsonb
);
