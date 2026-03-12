CREATE POLICY "Authenticated users can view varyasyonlar of active urunler"
ON public.urun_varyasyonlar
FOR SELECT
TO authenticated
USING (
  urun_id IN (
    SELECT id FROM urunler WHERE durum = 'aktif'
  )
);