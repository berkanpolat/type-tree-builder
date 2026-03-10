CREATE POLICY "Users can delete own teklifler"
ON public.ihale_teklifler
FOR DELETE
TO authenticated
USING (teklif_veren_user_id = auth.uid());