
-- Allow anonymous (non-logged-in) users to view public data

-- firmalar
DROP POLICY "Authenticated users can view all firmalar" ON public.firmalar;
CREATE POLICY "Anyone can view all firmalar" ON public.firmalar FOR SELECT TO anon, authenticated USING (true);

-- urunler
DROP POLICY "Authenticated users can view active urunler" ON public.urunler;
CREATE POLICY "Anyone can view active urunler" ON public.urunler FOR SELECT TO anon, authenticated USING ((durum = 'aktif') OR (auth.uid() = user_id));

-- ihaleler
DROP POLICY "Authenticated users can view active ihaleler" ON public.ihaleler;
CREATE POLICY "Anyone can view active ihaleler" ON public.ihaleler FOR SELECT TO anon, authenticated USING (durum = 'devam_ediyor');

-- urun_varyasyonlar
DROP POLICY "Authenticated users can view varyasyonlar of active urunler" ON public.urun_varyasyonlar;
CREATE POLICY "Anyone can view varyasyonlar of active urunler" ON public.urun_varyasyonlar FOR SELECT TO anon, authenticated USING (urun_id IN (SELECT id FROM urunler WHERE durum = 'aktif'));

-- firma_uretim_satis
DROP POLICY "Authenticated users can view all uretim_satis" ON public.firma_uretim_satis;
CREATE POLICY "Anyone can view all uretim_satis" ON public.firma_uretim_satis FOR SELECT TO anon, authenticated USING (true);

-- firma_urun_hizmet_secimler
DROP POLICY "Authenticated users can view all selections" ON public.firma_urun_hizmet_secimler;
CREATE POLICY "Anyone can view all selections" ON public.firma_urun_hizmet_secimler FOR SELECT TO anon, authenticated USING (true);

-- firma_galeri
DROP POLICY "Authenticated users can view all galeri" ON public.firma_galeri;
CREATE POLICY "Anyone can view all galeri" ON public.firma_galeri FOR SELECT TO anon, authenticated USING (true);

-- firma_makineler
DROP POLICY "Authenticated users can view all makineler" ON public.firma_makineler;
CREATE POLICY "Anyone can view all makineler" ON public.firma_makineler FOR SELECT TO anon, authenticated USING (true);

-- firma_referanslar
DROP POLICY "Authenticated users can view all referanslar" ON public.firma_referanslar;
CREATE POLICY "Anyone can view all referanslar" ON public.firma_referanslar FOR SELECT TO anon, authenticated USING (true);

-- firma_sertifikalar
DROP POLICY "Authenticated users can view all sertifikalar" ON public.firma_sertifikalar;
CREATE POLICY "Anyone can view all sertifikalar" ON public.firma_sertifikalar FOR SELECT TO anon, authenticated USING (true);

-- firma_teknolojiler
DROP POLICY "Authenticated users can view all teknolojiler" ON public.firma_teknolojiler;
CREATE POLICY "Anyone can view all teknolojiler" ON public.firma_teknolojiler FOR SELECT TO anon, authenticated USING (true);

-- firma_tesisler
DROP POLICY "Authenticated users can view all tesisler" ON public.firma_tesisler;
CREATE POLICY "Anyone can view all tesisler" ON public.firma_tesisler FOR SELECT TO anon, authenticated USING (true);
