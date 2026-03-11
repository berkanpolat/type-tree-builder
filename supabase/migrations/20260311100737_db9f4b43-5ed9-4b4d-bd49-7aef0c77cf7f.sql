
-- Allow users to read their own restrictions
CREATE POLICY "Users can view own restrictions"
ON public.firma_kisitlamalar FOR SELECT TO authenticated
USING (user_id = auth.uid());
