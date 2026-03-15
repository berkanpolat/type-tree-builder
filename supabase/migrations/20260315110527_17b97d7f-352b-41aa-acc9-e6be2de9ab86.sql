
-- Hedefler tablosu
CREATE TABLE public.admin_hedefler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atayan_admin_id uuid NOT NULL REFERENCES public.admin_users(id),
  hedef_admin_id uuid NOT NULL REFERENCES public.admin_users(id),
  hedef_turu text NOT NULL, -- 'ziyaret', 'aksiyon', 'paket_satis', 'firma_kaydi'
  baslik text NOT NULL,
  aciklama text,
  hedef_miktar integer NOT NULL,
  baslangic_tarihi date NOT NULL,
  bitis_tarihi date NOT NULL,
  durum text NOT NULL DEFAULT 'aktif', -- 'aktif', 'tamamlandi', 'iptal'
  gerceklesen_miktar integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Kademeli prim tablosu
CREATE TABLE public.admin_hedef_kademeleri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hedef_id uuid NOT NULL REFERENCES public.admin_hedefler(id) ON DELETE CASCADE,
  kademe_yuzdesi integer NOT NULL, -- 50, 75, 100 gibi
  prim_tutari numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.admin_hedefler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_hedef_kademeleri ENABLE ROW LEVEL SECURITY;
