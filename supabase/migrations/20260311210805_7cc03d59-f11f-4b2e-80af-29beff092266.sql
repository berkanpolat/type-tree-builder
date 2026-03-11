
-- Banners table for admin-managed ad/banner images
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  baslik text NOT NULL,
  sayfa text NOT NULL,
  konum text NOT NULL,
  boyut text NOT NULL,
  gorsel_url text,
  link_url text,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Everyone can read banners (public pages need them)
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Herkes bannerlari okuyabilir" ON public.banners FOR SELECT TO public USING (true);

-- Storage bucket for banner images
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);

-- Storage policies for banners bucket
CREATE POLICY "Anyone can view banner images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'banners');
CREATE POLICY "Service role can manage banner images" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'banners') WITH CHECK (bucket_id = 'banners');

-- Seed existing banner slots
INSERT INTO public.banners (slug, baslik, sayfa, konum, boyut) VALUES
  ('anasayfa-ana-banner', 'Ana Banner', 'AnaSayfa (TekPazar)', 'Sayfa üstü, tam genişlik', '1200×192 (h-48)'),
  ('anasayfa-alt-1', 'Alt Banner 1 - Stoktan', 'AnaSayfa (TekPazar)', 'Ana banner altı, sol (1/3)', '400×144 (h-36)'),
  ('anasayfa-alt-2', 'Alt Banner 2 - Satış', 'AnaSayfa (TekPazar)', 'Ana banner altı, orta (1/3)', '400×144 (h-36)'),
  ('anasayfa-alt-3', 'Alt Banner 3 - İplik', 'AnaSayfa (TekPazar)', 'Ana banner altı, sağ (1/3)', '400×144 (h-36)'),
  ('firma-detay-sidebar', 'Firma Detay Sidebar Reklam', 'Firma Detay', 'Sağ sidebar alt', '300×250 (otomatik)'),
  ('tekihale-sidebar', 'Tekİhale Sidebar Reklam', 'Tekİhale', 'Sol sidebar alt (yeni)', '300×250 (otomatik)'),
  ('urun-detay-alt-banner', 'Ürün Detay Alt Banner', 'Ürün Detay', 'Sayfa altı, tam genişlik', '1200×128 (h-32)'),
  ('dashboard-pro-banner', 'Dashboard PRO Banner', 'Dashboard', 'Sayfa altı, tam genişlik', '1200×160 (h-40)');
