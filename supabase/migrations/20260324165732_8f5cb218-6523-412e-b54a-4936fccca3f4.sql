
DROP POLICY IF EXISTS "Users can view own teklifler" ON public.ihale_teklifler;
CREATE POLICY "Users can view teklifler"
  ON public.ihale_teklifler FOR SELECT
  USING (true);
