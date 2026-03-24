-- Update SELECT policy to also show fake bids to ihale participants
DROP POLICY IF EXISTS "Users can view own teklifler" ON public.ihale_teklifler;
CREATE POLICY "Users can view own teklifler"
  ON public.ihale_teklifler FOR SELECT
  USING (
    teklif_veren_user_id = auth.uid()
    OR is_ihale_owner(auth.uid(), ihale_id)
    OR is_fake = true
  );