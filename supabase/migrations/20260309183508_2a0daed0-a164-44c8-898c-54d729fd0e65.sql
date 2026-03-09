
-- Add new columns to firmalar
ALTER TABLE public.firmalar
  ADD COLUMN IF NOT EXISTS fiziksel_magaza_sayisi integer,
  ADD COLUMN IF NOT EXISTS aylik_tedarik_sayisi integer,
  ADD COLUMN IF NOT EXISTS aylik_tedarik_birim_id uuid REFERENCES public.firma_bilgi_secenekleri(id);

-- Create new categories
INSERT INTO public.firma_bilgi_kategorileri (id, name) VALUES
  ('a0000001-0000-0000-0000-000000000019', 'Mevcut Pazarlar'),
  ('a0000001-0000-0000-0000-000000000020', 'Hedeflenen Pazarlar'),
  ('a0000001-0000-0000-0000-000000000021', 'Online Satış Platformları'),
  ('a0000001-0000-0000-0000-000000000022', 'Üretici / Tedarikçi Seçim Kriterleri');

-- Seed: Mevcut Pazarlar & Hedeflenen Pazarlar (same options)
INSERT INTO public.firma_bilgi_secenekleri (kategori_id, name) VALUES
  ('a0000001-0000-0000-0000-000000000019', 'Türkiye (İç Pazar)'),
  ('a0000001-0000-0000-0000-000000000019', 'Avrupa'),
  ('a0000001-0000-0000-0000-000000000019', 'ABD / Kanada'),
  ('a0000001-0000-0000-0000-000000000019', 'Ortadoğu'),
  ('a0000001-0000-0000-0000-000000000019', 'Asya'),
  ('a0000001-0000-0000-0000-000000000019', 'Afrika'),
  ('a0000001-0000-0000-0000-000000000019', 'Güney Amerika'),
  ('a0000001-0000-0000-0000-000000000019', 'Rusya / BDT'),
  ('a0000001-0000-0000-0000-000000000019', 'Avustralya / Okyanusya'),
  ('a0000001-0000-0000-0000-000000000020', 'Türkiye (İç Pazar)'),
  ('a0000001-0000-0000-0000-000000000020', 'Avrupa'),
  ('a0000001-0000-0000-0000-000000000020', 'ABD / Kanada'),
  ('a0000001-0000-0000-0000-000000000020', 'Ortadoğu'),
  ('a0000001-0000-0000-0000-000000000020', 'Asya'),
  ('a0000001-0000-0000-0000-000000000020', 'Afrika'),
  ('a0000001-0000-0000-0000-000000000020', 'Güney Amerika'),
  ('a0000001-0000-0000-0000-000000000020', 'Rusya / BDT'),
  ('a0000001-0000-0000-0000-000000000020', 'Avustralya / Okyanusya');

-- Seed: Online Satış Platformları
INSERT INTO public.firma_bilgi_secenekleri (kategori_id, name) VALUES
  ('a0000001-0000-0000-0000-000000000021', 'Trendyol'),
  ('a0000001-0000-0000-0000-000000000021', 'Hepsiburada'),
  ('a0000001-0000-0000-0000-000000000021', 'Amazon'),
  ('a0000001-0000-0000-0000-000000000021', 'N11'),
  ('a0000001-0000-0000-0000-000000000021', 'Çiçeksepeti'),
  ('a0000001-0000-0000-0000-000000000021', 'Kendi Web Sitesi'),
  ('a0000001-0000-0000-0000-000000000021', 'Shopify'),
  ('a0000001-0000-0000-0000-000000000021', 'ASOS Marketplace'),
  ('a0000001-0000-0000-0000-000000000021', 'Etsy'),
  ('a0000001-0000-0000-0000-000000000021', 'Diğer');

-- Seed: Üretici / Tedarikçi Seçim Kriterleri
INSERT INTO public.firma_bilgi_secenekleri (kategori_id, name) VALUES
  ('a0000001-0000-0000-0000-000000000022', 'Fiyat'),
  ('a0000001-0000-0000-0000-000000000022', 'Kalite'),
  ('a0000001-0000-0000-0000-000000000022', 'Teslimat Süresi'),
  ('a0000001-0000-0000-0000-000000000022', 'MOQ Esnekliği'),
  ('a0000001-0000-0000-0000-000000000022', 'Sertifika / Uygunluk'),
  ('a0000001-0000-0000-0000-000000000022', 'Coğrafi Yakınlık'),
  ('a0000001-0000-0000-0000-000000000022', 'Sürdürülebilirlik'),
  ('a0000001-0000-0000-0000-000000000022', 'Referanslar'),
  ('a0000001-0000-0000-0000-000000000022', 'Numune Kapasitesi'),
  ('a0000001-0000-0000-0000-000000000022', 'İletişim / Profesyonellik');
