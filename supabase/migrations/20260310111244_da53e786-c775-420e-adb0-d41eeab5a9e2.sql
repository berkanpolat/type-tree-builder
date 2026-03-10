
-- Allow all authenticated users to view firma_urun_hizmet_secimler for filtering
CREATE POLICY "Authenticated users can view all selections"
ON public.firma_urun_hizmet_secimler
FOR SELECT TO authenticated
USING (true);

-- Allow all authenticated users to view firma_uretim_satis for filtering
CREATE POLICY "Authenticated users can view all uretim_satis"
ON public.firma_uretim_satis
FOR SELECT TO authenticated
USING (true);
