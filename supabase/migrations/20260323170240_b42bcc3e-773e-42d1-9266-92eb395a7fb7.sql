-- Add siparis_birimi column with default 'Adet'
ALTER TABLE public.urunler ADD COLUMN siparis_birimi text NOT NULL DEFAULT 'Adet';

-- Update existing products: pull unit from their variations if varyant_1_label = 'Birim'
UPDATE public.urunler u
SET siparis_birimi = sub.varyant_1_value
FROM (
  SELECT DISTINCT ON (urun_id) urun_id, varyant_1_value
  FROM public.urun_varyasyonlar
  WHERE varyant_1_label = 'Birim'
  ORDER BY urun_id, created_at
) sub
WHERE u.id = sub.urun_id;