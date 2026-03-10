
-- Allow ihale owners to update teklifler (for kabul/red actions)
CREATE POLICY "Ihale owners can update teklifler"
ON public.ihale_teklifler
FOR UPDATE
TO authenticated
USING (ihale_id IN (SELECT id FROM public.ihaleler WHERE user_id = auth.uid()))
WITH CHECK (ihale_id IN (SELECT id FROM public.ihaleler WHERE user_id = auth.uid()));
