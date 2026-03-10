
-- Allow authenticated users to view active (devam_ediyor) tenders
CREATE POLICY "Authenticated users can view active ihaleler"
ON public.ihaleler
FOR SELECT
TO authenticated
USING (durum = 'devam_ediyor');
