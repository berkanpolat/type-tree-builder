
-- Drop all RESTRICTIVE SELECT policies on ihaleler and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can view active ihaleler" ON public.ihaleler;
DROP POLICY IF EXISTS "Users can view own ihaleler" ON public.ihaleler;
DROP POLICY IF EXISTS "Users can view ihaleler they bid on" ON public.ihaleler;

CREATE POLICY "Users can view own ihaleler" ON public.ihaleler
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view active ihaleler" ON public.ihaleler
  FOR SELECT TO authenticated
  USING (durum = 'devam_ediyor');

CREATE POLICY "Users can view ihaleler they bid on" ON public.ihaleler
  FOR SELECT TO authenticated
  USING (id IN (SELECT ihale_id FROM public.ihale_teklifler WHERE teklif_veren_user_id = auth.uid()));

-- Drop and recreate ihale_teklifler SELECT policy as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own teklifler" ON public.ihale_teklifler;

CREATE POLICY "Users can view own teklifler" ON public.ihale_teklifler
  FOR SELECT TO authenticated
  USING (
    teklif_veren_user_id = auth.uid()
    OR ihale_id IN (SELECT id FROM public.ihaleler WHERE user_id = auth.uid())
  );

-- Also fix ihale_stok - allow bidders to see stok for active ihaleler
DROP POLICY IF EXISTS "Ihale owners can manage stok" ON public.ihale_stok;

CREATE POLICY "Ihale owners can manage stok" ON public.ihale_stok
  FOR ALL TO authenticated
  USING (ihale_id IN (SELECT id FROM public.ihaleler WHERE user_id = auth.uid()))
  WITH CHECK (ihale_id IN (SELECT id FROM public.ihaleler WHERE user_id = auth.uid()));

CREATE POLICY "Users can view stok for active ihaleler" ON public.ihale_stok
  FOR SELECT TO authenticated
  USING (ihale_id IN (SELECT id FROM public.ihaleler WHERE durum = 'devam_ediyor'));

-- Fix ihale_filtreler similarly
DROP POLICY IF EXISTS "Ihale owners can manage filtreler" ON public.ihale_filtreler;

CREATE POLICY "Ihale owners can manage filtreler" ON public.ihale_filtreler
  FOR ALL TO authenticated
  USING (ihale_id IN (SELECT id FROM public.ihaleler WHERE user_id = auth.uid()))
  WITH CHECK (ihale_id IN (SELECT id FROM public.ihaleler WHERE user_id = auth.uid()));

CREATE POLICY "Users can view filtreler for active ihaleler" ON public.ihale_filtreler
  FOR SELECT TO authenticated
  USING (ihale_id IN (SELECT id FROM public.ihaleler WHERE durum = 'devam_ediyor'));
