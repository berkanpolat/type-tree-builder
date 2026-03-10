
-- Allow authenticated users to view ihaleler they have bid on (for Tekliflerim page)
CREATE POLICY "Users can view ihaleler they bid on"
ON public.ihaleler
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT ihale_id FROM public.ihale_teklifler
    WHERE teklif_veren_user_id = auth.uid()
  )
);
