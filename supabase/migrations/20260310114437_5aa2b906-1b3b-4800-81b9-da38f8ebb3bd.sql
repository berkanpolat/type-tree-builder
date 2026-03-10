
-- Allow authenticated users to view all firma_tesisler
CREATE POLICY "Authenticated users can view all tesisler"
ON public.firma_tesisler FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to view all firma_sertifikalar
CREATE POLICY "Authenticated users can view all sertifikalar"
ON public.firma_sertifikalar FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to view all firma_referanslar
CREATE POLICY "Authenticated users can view all referanslar"
ON public.firma_referanslar FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to view all firma_galeri
CREATE POLICY "Authenticated users can view all galeri"
ON public.firma_galeri FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to view all firma_makineler
CREATE POLICY "Authenticated users can view all makineler"
ON public.firma_makineler FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to view all firma_teknolojiler
CREATE POLICY "Authenticated users can view all teknolojiler"
ON public.firma_teknolojiler FOR SELECT TO authenticated
USING (true);
